import type { Categoria, Lancamento } from './types';

export interface Resumo {
  previsao: number; // tudo lançado no mês
  real: number; // só o que já caiu / foi pago
  falta: number; // previsão − real
}

export function resumo(list: readonly Lancamento[]): Resumo {
  let previsao = 0;
  let real = 0;
  for (const l of list) {
    previsao += l.valor;
    if (l.resolvido) real += l.valor;
  }
  return { previsao, real, falta: previsao - real };
}

export interface TotalCategoria {
  id: string | null;
  nome: string;
  valor: number;
}

/** Total por categoria (previsão), do maior para o menor. */
export function porCategoria(list: readonly Lancamento[], categorias: readonly Categoria[]): TotalCategoria[] {
  const nomes = new Map(categorias.map((c) => [c.id, c.nome]));
  const totais = new Map<string | null, number>();
  for (const l of list) {
    const key = l.categoria_id && nomes.has(l.categoria_id) ? l.categoria_id : null;
    totais.set(key, (totais.get(key) ?? 0) + l.valor);
  }
  return [...totais]
    .map(([id, valor]) => ({ id, nome: id ? nomes.get(id) ?? '' : 'Sem categoria', valor }))
    .sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'));
}
