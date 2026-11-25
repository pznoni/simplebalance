import { afterEach, describe, expect, it } from 'vitest';
import { setFechamento } from './dates';
import { compararCategorias, diferencas, porMes } from './stats';
import type { Lancamento } from './types';

const l = (p: Partial<Lancamento>): Lancamento => ({
  id: Math.random().toString(36),
  tipo: 'variavel',
  valor: 100,
  valor_real: null,
  descricao: 'x',
  data: '2026-11-10',
  categoria_id: null,
  pagamento: 'debito',
  resolvido: false,
  created_at: '2026-11-10T00:00:00Z',
  ...p,
});

describe('estatísticas com dia de fechamento', () => {
  afterEach(() => setFechamento(null));

  // Fechamento 20: "Novembro" = 21/out a 20/nov; dia 22/nov já é "Dezembro".
  const list = [
    l({ data: '2026-10-21', valor: 1000, resolvido: true }),
    l({ data: '2026-11-20', valor: 2000, valor_real: 2500, resolvido: true }),
    l({ data: '2026-11-22', valor: 4000 }),
  ];

  it('agrupa os meses pelo ciclo, não pelo calendário', () => {
    setFechamento(20);
    expect(porMes(list, ['2026-11', '2026-12']).map((m) => [m.ym, m.previsto, m.real])).toEqual([
      ['2026-11', 3000, 3500],
      ['2026-12', 4000, 0],
    ]);
  });

  it('categorias e diferenças usam o mesmo ciclo', () => {
    setFechamento(20);
    expect(compararCategorias(list, '2026-12', []).map((c) => [c.atual, c.anterior])).toEqual([[4000, 3500]]);
    expect(diferencas(list, '2026-11')).toMatchObject({ total: 500, resolvidos: 2, exatos: 1 });
  });

  it('sem fechamento, volta ao mês do calendário', () => {
    expect(porMes(list, ['2026-10', '2026-11']).map((m) => m.previsto)).toEqual([1000, 6000]);
  });
});
