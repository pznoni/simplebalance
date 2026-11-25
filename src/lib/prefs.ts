// Preferências do usuário guardadas no Supabase (valem em todos os aparelhos).
import { supabase } from './supabase';
import { traduz } from './api';

const CACHE_KEY = 'simplebalance.fechamento';

/** Dia de fechamento salvo (null = mês do calendário). */
export async function lerFechamento(): Promise<number | null> {
  const { data, error } = await supabase.from('preferencias').select('dia_fechamento').maybeSingle();
  if (error) throw new Error(traduz(error.message));
  const dia = data?.dia_fechamento ?? null;
  guardarCache(dia);
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
