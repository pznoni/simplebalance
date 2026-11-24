export type Tipo = 'fixo' | 'variavel';
export type Pagamento = 'credito' | 'debito';

export interface Categoria {
  id: string;
  nome: string;
  ordem: number;
}

export interface Lancamento {
  id: string;
  tipo: Tipo;
  valor: number; // previsto, em centavos
  valor_real: number | null; // o que de fato caiu/foi pago; null = igual ao previsto
  descricao: string;
  data: string; // AAAA-MM-DD (em fixo é o vencimento)
  categoria_id: string | null;
  pagamento: Pagamento;
  resolvido: boolean; // crédito: caiu / débito: pago
  created_at: string;
}

export type NovoLancamento = Omit<Lancamento, 'id' | 'created_at'>;

/** Crédito: "caiu" / "a cair". Débito: "pago" / "a pagar". */
export function statusLabel(l: Pick<Lancamento, 'pagamento' | 'resolvido'>): string {
  if (l.pagamento === 'credito') return l.resolvido ? 'caiu' : 'a cair';
  return l.resolvido ? 'pago' : 'a pagar';
}

export const PAGAMENTO_LABEL: Record<Pagamento, string> = { credito: 'Crédito', debito: 'Débito' };
export const TIPO_LABEL: Record<Tipo, string> = { fixo: 'Fixo', variavel: 'Variável' };
