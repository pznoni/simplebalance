import { describe, expect, it } from 'vitest';
import { proximaVisao } from './visao';

describe('botão previsto/real', () => {
  it('alterna previsto+real → só real → só previsto → previsto+real', () => {
    expect(proximaVisao('ambos')).toBe('real');
    expect(proximaVisao('real')).toBe('previsto');
    expect(proximaVisao('previsto')).toBe('ambos');
  });
});
