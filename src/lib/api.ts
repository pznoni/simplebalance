// Acesso ao Supabase. A RLS garante que cada usuário só lê e grava o que é seu.
import { supabase } from './supabase';
import { addMonths, dateInMonth, monthRange } from './dates';
import type { Categoria, Lancamento, NovoLancamento } from './types';

const LANC_COLS = 'id, tipo, valor, descricao, data, categoria_id, pagamento, resolvido, created_at';
const CAT_COLS = 'id, nome, ordem';

export function traduz(msg: string): string {
  if (/duplicate key|unique/i.test(msg)) return 'Já existe uma categoria com esse nome.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Sem conexão. Tente de novo.';
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/already registered/i.test(msg)) return 'Esse e-mail já tem conta. Use "Entrar".';
  if (/Password should|weak.?password|password.*(characters|length)/i.test(msg)) return 'Senha fraca: use pelo menos 10 caracteres, com letras e números.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
  if (/JWT|session/i.test(msg)) return 'Sua sessão expirou. Entre de novo.';
  if (/^Limite de \d+ registros atingido\.$/.test(msg)) return msg;
  // Não mostra detalhes internos do banco na tela; ficam só no console.
  console.error(msg);
  return 'Algo deu errado. Tente de novo.';
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(traduz(error.message));
}

export async function listarMes(ym: string): Promise<Lancamento[]> {
  const { from, to } = monthRange(ym);
  const { data, error } = await supabase
    .from('lancamentos')
    .select(LANC_COLS)
    .gte('data', from)
    .lte('data', to)
    .order('data', { ascending: false })
    .order('created_at', { ascending: false });
  fail(error);
  return (data ?? []) as Lancamento[];
}

export async function salvarLancamento(l: NovoLancamento, id?: string): Promise<void> {
  const { error } = id
    ? await supabase.from('lancamentos').update(l).eq('id', id)
    : await supabase.from('lancamentos').insert(l);
  fail(error);
}

export async function marcarResolvido(id: string, resolvido: boolean): Promise<void> {
  const { error } = await supabase.from('lancamentos').update({ resolvido }).eq('id', id);
  fail(error);
}

export async function excluirLancamento(id: string): Promise<void> {
  const { error } = await supabase.from('lancamentos').delete().eq('id', id);
  fail(error);
}

/** Copia os fixos do mês anterior para `ym`, pendentes, no mesmo dia do mês. */
export async function copiarFixosDoMesAnterior(ym: string): Promise<number> {
  const anteriores = (await listarMes(addMonths(ym, -1))).filter((l) => l.tipo === 'fixo');
  if (!anteriores.length) return 0;
  const novos: NovoLancamento[] = anteriores.map((l) => ({
    tipo: 'fixo',
    valor: l.valor,
    descricao: l.descricao,
    data: dateInMonth(ym, Number(l.data.slice(8, 10))),
    categoria_id: l.categoria_id,
    pagamento: l.pagamento,
    resolvido: false,
  }));
  const { error } = await supabase.from('lancamentos').insert(novos);
  fail(error);
  return novos.length;
}

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from('categorias').select(CAT_COLS).order('ordem').order('nome');
  fail(error);
  return (data ?? []) as Categoria[];
}

export async function criarCategoria(nome: string, ordem: number): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .insert({ nome: nome.trim(), ordem })
    .select(CAT_COLS)
    .single();
  fail(error);
  return data as Categoria;
}

export async function renomearCategoria(id: string, nome: string): Promise<void> {
  const { error } = await supabase.from('categorias').update({ nome: nome.trim() }).eq('id', id);
  fail(error);
}

/** Lançamentos que usavam a categoria ficam "Sem categoria" (on delete set null). */
export async function excluirCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  fail(error);
}

/** Backup completo em JSON (categorias + todos os lançamentos). */
export async function exportarBackup(): Promise<string> {
  const [cats, lancs] = await Promise.all([
    supabase.from('categorias').select(CAT_COLS).order('ordem'),
    supabase.from('lancamentos').select(LANC_COLS).order('data'),
  ]);
  fail(cats.error);
  fail(lancs.error);
  return JSON.stringify(
    { app: 'simplebalance', exportedAt: new Date().toISOString(), categorias: cats.data, lancamentos: lancs.data },
    null,
    2,
  );
}
