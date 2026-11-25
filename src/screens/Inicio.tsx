import { addMonths, currentMonth, monthTitle } from '../lib/dates';
import { porCategoria, resumo } from '../lib/calc';
import { usePrivacy } from '../lib/privacy';
import type { Categoria, Lancamento, Tipo } from '../lib/types';
import { Bar, EyeToggle, PrevReal, ThemeToggle } from '../components/ui';
import { go } from '../lib/nav';

interface Props {
  month: string;
  setMonth: (ym: string) => void;
  lancs: Lancamento[];
  cats: Categoria[];
  loading: boolean;
}

export function Inicio({ month, setMonth, lancs, cats, loading }: Props) {
  const total = resumo(lancs);
  const fixo = resumo(lancs.filter((l) => l.tipo === 'fixo'));
  const variavel = resumo(lancs.filter((l) => l.tipo === 'variavel'));
  const categorias = porCategoria(lancs, cats);
  const maxCat = categorias[0]?.valor ?? 0;
  const { money } = usePrivacy();

  return (
    <main className={`page ${loading ? 'is-loading' : ''}`}>
      <div className="top-bar">
        <button type="button" className="eye" aria-label="Estatísticas" onClick={() => go('#/estatisticas')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M5 20v-8M12 20V5M19 20v-11" />
          </svg>
        </button>
        <ThemeToggle />
        <EyeToggle />
        <button type="button" className="eye" aria-label="Ajustes" onClick={() => go('#/ajustes')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
      <header className="month-head">
        <button type="button" className="month-nav" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}>
          ‹
        </button>
        <h1 className="title-xl">{monthTitle(month)}</h1>
        <button type="button" className="month-nav" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}>
          ›
        </button>
      </header>
      {month !== currentMonth() && (
        <button type="button" className="link today-link" onClick={() => setMonth(currentMonth())}>
          Voltar para o mês atual
        </button>
      )}

      <section className="card">
        <h2 className="card-title">Total do mês</h2>
        <PrevReal previsao={total.previsao} real={total.real} />
        <Bar value={total.real} max={total.previsao} />
        {(total.previsao === 0 || total.falta > 0) && (
          <p className="muted small">
            {total.previsao === 0 ? 'Nada lançado neste mês.' : `Faltam ${money(total.falta)} cair/pagar`}
          </p>
        )}
      </section>

      <TipoCard tipo="fixo" titulo="Fixo" r={fixo} />
      <TipoCard tipo="variavel" titulo="Variável" r={variavel} />

      <section className="card">
        <h2 className="card-title">Por categoria</h2>
        {categorias.length === 0 ? (
          <p className="muted small">Sem lançamentos.</p>
        ) : (
          <ul className="cat-list">
            {categorias.map((c) => (
              <li key={c.id ?? 'none'}>
                <div className="cat-row">
                  <span>{c.nome}</span>
                  <span className="num">{money(c.valor)}</span>
                </div>
                <Bar value={c.valor} max={maxCat} thin />
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="page-foot">
        <button type="button" className="link" onClick={() => go('#/ajustes')}>
          Ajustes
        </button>
      </footer>
    </main>
  );
}

function TipoCard({ tipo, titulo, r }: { tipo: Tipo; titulo: string; r: ReturnType<typeof resumo> }) {
  return (
    <button type="button" className="card card-link" onClick={() => go(`#/${tipo}`)}>
      <div className="card-link-head">
        <h2 className="card-title">{titulo}</h2>
        <span className="chev" aria-hidden="true">›</span>
      </div>
      <PrevReal previsao={r.previsao} real={r.real} compact />
    </button>
  );
}
