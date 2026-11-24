import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from './lib/supabase';
import * as api from './lib/api';
import { currentMonth } from './lib/dates';
import type { Categoria, Lancamento, Tipo } from './lib/types';
import { Login } from './screens/Login';
import { Inicio } from './screens/Inicio';
import { Lista } from './screens/Lista';
import { Ajustes } from './screens/Ajustes';
import { LancamentoSheet, type SheetState } from './components/LancamentoSheet';
import { Toast, useToast } from './components/Toast';
import { UpdatePrompt } from './components/UpdatePrompt';

type Route = { name: 'inicio' } | { name: 'lista'; tipo: Tipo } | { name: 'ajustes' };

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'fixo' || h === 'variavel') return { name: 'lista', tipo: h };
  if (h === 'ajustes') return { name: 'ajustes' };
  return { name: 'inicio' };
}


const MONTH_KEY = 'simplebalance.mes';

function readMonth(): string {
  try {
    const saved = sessionStorage.getItem(MONTH_KEY);
    if (saved && /^\d{4}-(0[1-9]|1[0-2])$/.test(saved)) return saved;
  } catch {
    /* sem armazenamento: usa o mês atual */
  }
  return currentMonth();
}

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configured) {
    return (
      <main className="center-screen">
        <p className="muted">
          Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code>.
        </p>
      </main>
    );
  }
  if (session === undefined) return <main className="center-screen" />;
  if (!session) return <Login />;
  return <Shell key={session.user.id} email={session.user.email ?? ''} />;
}

function Shell({ email }: { email: string }) {
  const [route, setRoute] = useState<Route>(parseHash);
  const [month, setMonthState] = useState(readMonth);
  const [lancs, setLancs] = useState<Lancamento[] | null>(null);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [sheet, setSheet] = useState<SheetState>(null);
  const toast = useToast();

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setMonth = (ym: string) => {
    setMonthState(ym);
    try {
      sessionStorage.setItem(MONTH_KEY, ym);
    } catch {
      /* ignora */
    }
  };

  const reload = useCallback(async () => {
    try {
      const [l, c] = await Promise.all([api.listarMes(month), api.listarCategorias()]);
      setLancs(l);
      setCats(c);
    } catch (err) {
      toast.show((err as Error).message, 'error');
    }
  }, [month, toast]);

  useEffect(() => {
    setLancs(null);
    void reload();
  }, [reload]);

  // Ao voltar para o app (PWA em segundo plano), busca de novo.
  useEffect(() => {
    const onVis = () => document.visibilityState === 'visible' && void reload();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [reload]);

  /** Alterna o status na hora (otimista) e desfaz se o banco recusar. */
  const toggle = async (l: Lancamento) => {
    const next = !l.resolvido;
    setLancs((list) => list?.map((x) => (x.id === l.id ? { ...x, resolvido: next } : x)) ?? null);
    try {
      await api.marcarResolvido(l.id, next);
    } catch (err) {
      setLancs((list) => list?.map((x) => (x.id === l.id ? { ...x, resolvido: !next } : x)) ?? null);
      toast.show((err as Error).message, 'error');
    }
  };

  const list = lancs ?? [];

  return (
    <>
      {route.name === 'inicio' && (
        <Inicio month={month} setMonth={setMonth} lancs={list} cats={cats} loading={!lancs} />
      )}
      {route.name === 'lista' && (
        <Lista
          tipo={route.tipo}
          month={month}
          lancs={list.filter((l) => l.tipo === route.tipo)}
          cats={cats}
          loading={!lancs}
          onToggle={toggle}
          onNew={() => setSheet({ tipo: route.tipo })}
          onEdit={(l) => setSheet({ tipo: l.tipo, editing: l })}
          onCopied={reload}
          toast={toast.show}
        />
      )}
      {route.name === 'ajustes' && (
        <Ajustes email={email} cats={cats} onChanged={reload} toast={toast.show} />
      )}

      <LancamentoSheet
        state={sheet}
        month={month}
        cats={cats}
        onClose={() => setSheet(null)}
        onSaved={() => {
          setSheet(null);
          void reload();
        }}
        onCatsChanged={setCats}
        toast={toast.show}
      />
      <Toast {...toast.props} />
      <UpdatePrompt />
    </>
  );
}
