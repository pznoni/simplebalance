import { afterEach, describe, expect, it } from 'vitest';
import { addDays, monthRange, periodOf, setFechamento } from './dates';

afterEach(() => setFechamento(null));

describe('dia de fechamento', () => {
  it('sem fechamento: mês do calendário', () => {
    expect(periodOf('2026-11-25')).toBe('2026-11');
    expect(monthRange('2026-11')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('fechamento 20: depois do dia 20 é o mês seguinte', () => {
    setFechamento(20);
    expect(periodOf('2026-11-20')).toBe('2026-11');
    expect(periodOf('2026-11-21')).toBe('2026-12');
    expect(periodOf('2026-12-25')).toBe('2027-01');
    expect(monthRange('2026-11')).toEqual({ from: '2026-10-21', to: '2026-11-20' });
    expect(monthRange('2027-01')).toEqual({ from: '2026-12-21', to: '2027-01-20' });
  });

  it('fechamento 30 em fevereiro: limita ao fim do mês e não pula dias', () => {
    setFechamento(30);
    expect(monthRange('2027-02')).toEqual({ from: '2027-01-31', to: '2027-02-28' });
    expect(monthRange('2027-03')).toEqual({ from: '2027-03-01', to: '2027-03-30' });
    expect(periodOf('2027-01-31')).toBe('2027-02');
    expect(periodOf('2027-02-28')).toBe('2027-02');
  });

  it('ciclos seguidos não têm buraco nem sobreposição', () => {
    for (const f of [1, 15, 20, 28, 29, 30, 31]) {
      setFechamento(f);
      for (const ym of ['2026-12', '2027-01', '2027-02', '2027-03', '2028-02', '2028-03']) {
        const atual = monthRange(ym);
        const [y, m] = ym.split('-').map(Number);
        const prox = monthRange(`${m === 12 ? y! + 1 : y}-${String((m! % 12) + 1).padStart(2, '0')}`);
        expect(addDays(atual.to, 1)).toBe(prox.from);
        expect(periodOf(atual.from)).toBe(ym);
        expect(periodOf(atual.to)).toBe(ym);
      }
    }
  });

  it('valores inválidos voltam para o mês do calendário', () => {
    setFechamento(0);
    expect(periodOf('2026-11-25')).toBe('2026-11');
    setFechamento(40);
    expect(periodOf('2026-11-25')).toBe('2026-11');
  });
});
