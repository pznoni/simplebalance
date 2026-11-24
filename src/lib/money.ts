// Dinheiro sempre em centavos inteiros (bigint no Postgres).

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 123456 → "R$ 1.234,56" */
export function formatBRL(cents: number): string {
  return brl.format((cents || 0) / 100);
}

/**
 * Texto digitado → centavos, sem passar por float.
 * Aceita "12", "12,5", "1.234,56", "1234.56", "R$ 10,00". Retorna NaN se inválido.
 */
export function parseMoney(input: string): number {
  const s = input.trim().replace(/R\$|\s| /g, '');
  if (!s || !/^[\d.,]+$/.test(s)) return NaN;
  if (s.split(',').length > 2 && !s.includes('.')) return NaN; // "1,2,3"

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let intPart = s;
  let decPart = '';

  if (lastComma > lastDot) {
    intPart = s.slice(0, lastComma);
    decPart = s.slice(lastComma + 1);
  } else if (lastDot > -1 && lastComma === -1) {
    // Só pontos: decimal se houver um único ponto seguido de 1–2 dígitos ("12.5").
    const after = s.length - lastDot - 1;
    if (s.indexOf('.') === lastDot && after > 0 && after <= 2) {
      intPart = s.slice(0, lastDot);
      decPart = s.slice(lastDot + 1);
    }
  } else if (lastDot > lastComma) {
    intPart = s.slice(0, lastDot);
    decPart = s.slice(lastDot + 1);
  }

  intPart = intPart.replace(/[.,]/g, '') || '0';
  if (/[.,]/.test(decPart) || decPart.length > 2) return NaN;
  const cents = Number(intPart) * 100 + Number((decPart + '00').slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : NaN;
}

/** Diferença real − previsto: -1300 → "R$ 13,00 abaixo do previsto". */
export function diffLabel(diff: number): string {
  return `${formatBRL(Math.abs(diff))} ${diff < 0 ? 'abaixo' : 'acima'} do previsto`;
}

/** Centavos → texto editável "1234,56". */
export function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
}
