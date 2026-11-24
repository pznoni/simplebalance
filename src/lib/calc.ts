import type { Categoria, Lancamento } from './types';

export interface Resumo {
  previsao: number; // tudo lançado no mês (valores previstos)
  real: number; // o que já caiu / foi pago, pelo valor real
  falta: number; // previsto dos pendentes
  diferenca: number; // real − previsto dos resolvidos (negativo = veio menos)
}

/** Valor que vale para o lançamento: o real, se resolvido e informado; senão o previsto. */
export function valorEfetivo(l: Pick<Lancamento, 'valor' | 'valor_real' | 'resolvido'>): number {
  return l.resolvido && l.valor_real != null ? l.valor_real : l.valor;
}

export function resumo(list: readonly Lancamento[]): Resumo {
  let previsao = 0;
  let real = 0;
  let falta = 0;
  let diferenca = 0;
  for (const l of list) {
    previsao += l.valor;
    if (l.resolvido) {
      const v = valorEfetivo(l);
      real += v;
      diferenca += v - l.valor;
    } else {
      falta += l.valor;
    }
  }
  return { previsao, real, falta, diferenca };
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
