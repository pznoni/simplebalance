// Preferências do usuário guardadas no Supabase (valem em todos os aparelhos).
import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { traduz } from './api';

const CACHE_KEY = 'simplebalance.fechamento';

// ---------- Renda mensal (centavos) ----------
// Fica só em memória (não vai para o localStorage) e avisa quem usa: Início e Ajustes.
let renda: number | null = null;
const ouvintes = new Set<() => void>();

function definirRenda(valor: number | null): void {
  renda = valor;
  ouvintes.forEach((f) => f());
}

/** Renda mensal atual (null = não informada). Atualiza a tela quando muda. */
export function useRenda(): number | null {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => renda,
  );
}

export async function salvarRenda(valor: number | null): Promise<void> {
  const { error } = await supabase.from('preferencias').upsert({ renda_mensal: valor }, { onConflict: 'user_id' });
  if (error) throw new Error(traduz(error.message));
  definirRenda(valor);
}

// ---------- Dia de fechamento ----------

/** Lê as preferências salvas. Devolve o dia de fechamento (null = mês do calendário) e carrega a renda. */
export async function lerFechamento(): Promise<number | null> {
  const { data, error } = await supabase.from('preferencias').select('dia_fechamento, renda_mensal').maybeSingle();
  if (error) throw new Error(traduz(error.message));
  const dia = data?.dia_fechamento ?? null;
  guardarCache(dia);
  definirRenda(data?.renda_mensal ?? null);
  return dia;
}

export async function salvarFechamento(dia: number | null): Promise<void> {
  const { error } = await supabase.from('preferencias').upsert({ dia_fechamento: dia }, { onConflict: 'user_id' });
  if (error) throw new Error(traduz(error.message));
  guardarCache(dia);
}

/** Último valor conhecido neste aparelho, para abrir já no ciclo certo antes da rede responder. */
export function fechamentoEmCache(): number | null {
  try {
    const v = Number(localStorage.getItem(CACHE_KEY));
    return Number.isInteger(v) && v >= 1 && v <= 31 ? v : null;
  } catch {
    return null;
  }
}

function guardarCache(dia: number | null): void {
  try {
    if (dia) localStorage.setItem(CACHE_KEY, String(dia));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    /* sem armazenamento: só não tem cache */
  }
}
