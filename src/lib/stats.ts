// Estatísticas: comparações entre meses, categorias e previsto × real.
import { valorEfetivo } from './calc';
import { addMonths, periodOf } from './dates';
import type { Categoria, Lancamento } from './types';

export interface Mes {
  ym: string;
  previsto: number; // tudo lançado
  real: number; // o que já caiu/foi pago, pelo valor real
  fixo: number; // valor efetivo dos fixos
  variavel: number; // valor efetivo dos variáveis
}

/** Os `n` meses que terminam em `ym`, do mais antigo para o mais novo. */
export function mesesAte(ym: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonths(ym, i - n + 1));
}

export function porMes(list: readonly Lancamento[], meses: readonly string[]): Mes[] {
  const map = new Map(meses.map((ym) => [ym, { ym, previsto: 0, real: 0, fixo: 0, variavel: 0 }]));
  for (const l of list) {
    const m = map.get(periodOf(l.data));
    if (!m) continue;
    const v = valorEfetivo(l);
    m.previsto += l.valor;
    if (l.resolvido) m.real += v;
    if (l.tipo === 'fixo') m.fixo += v;
    else m.variavel += v;
  }
  return meses.map((ym) => map.get(ym)!);
}

/** Média do real dos outros meses com lançamentos (exclui `ym`); null se não houver. */
export function mediaReal(meses: readonly Mes[], ym: string): number | null {
  const outros = meses.filter((m) => m.ym !== ym && m.previsto > 0);
  if (!outros.length) return null;
  return Math.round(outros.reduce((s, m) => s + m.real, 0) / outros.length);
}

/** Variação percentual de `de` para `para`, arredondada; null se `de` for zero. */
export function variacao(para: number, de: number): number | null {
  return de === 0 ? null : Math.round(((para - de) / de) * 100);
}

export interface CategoriaComparada {
  id: string | null;
  nome: string;
  atual: number;
  anterior: number;
  delta: number; // atual − anterior
}

/** Valor efetivo por categoria em `ym` vs o mês anterior, pela maior mudança. */
export function compararCategorias(
  list: readonly Lancamento[],
  ym: string,
  categorias: readonly Categoria[],
): CategoriaComparada[] {
  const ant = addMonths(ym, -1);
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  const totais = new Map<string | null, { atual: number; anterior: number }>();
  for (const l of list) {
    const mes = periodOf(l.data);
    if (mes !== ym && mes !== ant) continue;
    const key = l.categoria_id && nomes.has(l.categoria_id) ? l.categoria_id : null;
    const t = totais.get(key) ?? { atual: 0, anterior: 0 };
    if (mes === ym) t.atual += valorEfetivo(l);
    else t.anterior += valorEfetivo(l);
    totais.set(key, t);
  }
  return [...totais]
    .map(([id, t]) => ({ id, nome: id ? nomes.get(id) ?? '' : 'Sem categoria', ...t, delta: t.atual - t.anterior }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.atual - a.atual || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export interface Diferenca {
  lanc: Lancamento;
  delta: number; // real − previsto
}

export interface ResumoDiferencas {
  itens: Diferenca[]; // só os que diferem, pela maior diferença
  total: number; // soma das diferenças
  resolvidos: number; // quantos resolvidos no mês
  exatos: number; // quantos resolvidos bateram com o previsto
}

/** Previsto × real dos lançamentos resolvidos de `ym`. */
export function diferencas(list: readonly Lancamento[], ym: string): ResumoDiferencas {
  const resolvidos = list.filter((l) => l.resolvido && periodOf(l.data) === ym);
  const itens = resolvidos
    .map((lanc) => ({ lanc, delta: valorEfetivo(lanc) - lanc.valor }))
    .filter((d) => d.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.lanc.descricao.localeCompare(b.lanc.descricao, 'pt-BR'));
  return {
    itens,
    total: itens.reduce((s, d) => s + d.delta, 0),
    resolvidos: resolvidos.length,
    exatos: resolvidos.length - itens.length,
  };
}
