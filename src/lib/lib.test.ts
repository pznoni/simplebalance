import { describe, expect, it } from 'vitest';
import { parseMoney, formatBRL, centsToInput, diffLabel } from './money';
import { addMonths, dateInMonth, dayHeader, monthRange, monthTitle } from './dates';
import { porCategoria, resumo, valorEfetivo } from './calc';
import { statusLabel, type Lancamento } from './types';

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

describe('money', () => {
  it.each([
    ['12', 1200], ['12,5', 1250], ['1.234,56', 123456], ['1234.56', 123456],
    ['R$ 10,00', 1000], ['1.000', 100000], ['0,99', 99], ['1,234.56', 123456],
  ])('parseMoney(%s) = %i', (s, v) => expect(parseMoney(s)).toBe(v));

  it.each(['', 'abc', '1,2,3', '10,999', '-5'])('parseMoney(%s) é inválido', (s) => expect(parseMoney(s)).toBeNaN());

  it('formata e volta para o input', () => {
    expect(formatBRL(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
    expect(centsToInput(123405)).toBe('1234,05');
  });

  it('descreve a diferença entre real e previsto', () => {
    expect(diffLabel(-1300).replace(/\s/g, ' ')).toBe('R$ 13,00 abaixo do previsto');
    expect(diffLabel(50).replace(/\s/g, ' ')).toBe('R$ 0,50 acima do previsto');
  });
});

describe('dates', () => {
  it('soma meses atravessando o ano', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });
  it('limita o dia ao tamanho do mês', () => {
    expect(dateInMonth('2027-02', 31)).toBe('2027-02-28');
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
  it('títulos', () => {
    expect(monthTitle('2026-11', '2026-11-23')).toBe('Novembro');
    expect(monthTitle('2027-01', '2026-11-23')).toBe('Janeiro 2027');
    expect(dayHeader('2026-11-23', '2026-11-23')).toBe('Hoje');
    expect(dayHeader('2026-11-22', '2026-11-23')).toBe('Ontem');
    expect(dayHeader('2026-11-20', '2026-11-23')).toBe('Sexta, 20 nov');
  });
});

describe('calc', () => {
  it('previsão = tudo, real = resolvidos, falta = diferença', () => {
    const r = resumo([l({ valor: 1000, resolvido: true }), l({ valor: 250 }), l({ valor: 50, pagamento: 'credito', resolvido: true })]);
    expect(r).toEqual({ previsao: 1300, real: 1050, falta: 250, diferenca: 0 });
  });
  it('real usa o valor que caiu; falta só conta pendentes; diferença = real − previsto dos resolvidos', () => {
    const r = resumo([
      l({ valor: 20000, valor_real: 18700, resolvido: true }), // luz veio menor
      l({ valor: 5000, valor_real: 5500, resolvido: true }), // veio maior
      l({ valor: 3000, resolvido: true }), // sem valor real: igual ao previsto
      l({ valor: 1000, valor_real: 900 }), // pendente: valor real ignorado
    ]);
    expect(r).toEqual({ previsao: 29000, real: 27200, falta: 1000, diferenca: -800 });
  });
  it('valor efetivo: real se resolvido e informado, senão o previsto', () => {
    expect(valorEfetivo(l({ valor: 100, valor_real: 90, resolvido: true }))).toBe(90);
    expect(valorEfetivo(l({ valor: 100, valor_real: 90 }))).toBe(100);
    expect(valorEfetivo(l({ valor: 100, resolvido: true }))).toBe(100);
  });
  it('por categoria, do maior para o menor, com "Sem categoria"', () => {
    const cats = [{ id: 'a', nome: 'Mercado', ordem: 1 }, { id: 'b', nome: 'Lazer', ordem: 2 }];
    const r = porCategoria([l({ categoria_id: 'a', valor: 10 }), l({ categoria_id: 'b', valor: 30 }), l({ valor: 20 }), l({ categoria_id: 'a', valor: 5 })], cats);
    expect(r.map((c) => [c.nome, c.valor])).toEqual([['Lazer', 30], ['Sem categoria', 20], ['Mercado', 15]]);
  });
  it('rótulos de status', () => {
    expect(statusLabel({ pagamento: 'credito', resolvido: true })).toBe('caiu');
    expect(statusLabel({ pagamento: 'credito', resolvido: false })).toBe('a cair');
    expect(statusLabel({ pagamento: 'debito', resolvido: true })).toBe('pago');
    expect(statusLabel({ pagamento: 'debito', resolvido: false })).toBe('a pagar');
  });
});
