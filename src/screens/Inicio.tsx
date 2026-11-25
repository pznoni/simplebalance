import { currentMonth, monthTitle } from '../lib/dates';
import { porCategoria, resumo } from '../lib/calc';
import { usePrivacy } from '../lib/privacy';
import { useRenda } from '../lib/prefs';
import type { Categoria, Lancamento, Tipo } from '../lib/types';
import { Bar, EyeToggle, PrevReal, ThemeToggle, VisaoToggle } from '../components/ui';
import { useVisao } from '../lib/visao';
import { go, goCategoria } from '../lib/nav';

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
  const renda = useRenda();
  const { mostraPrevisto, mostraReal } = useVisao();

  return (
    <main className={`page ${loading ? 'is-loading' : ''}`}>
      <div className="top-bar">
        <button type="button" className="eye" aria-label="Estatísticas" onClick={() => go('#/estatisticas')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <path d="M5 20v-8M12 20V5M19 20v-11" />
          </svg>
        </button>
        <VisaoToggle />
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
        {/* Toque no mês abre o seletor nativo (roleta de mês/ano no iPhone). */}
        <label className="month-pick">
          <h1 className="title-xl">{monthTitle(month)}</h1>
          <svg className="month-pick-chev" viewBox="0 0 12 8" aria-hidden="true">
            <path d="M1.5 1.5L6 6l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            type="month"
            aria-label="Escolher mês"
            value={month}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch {
                /* navegador sem showPicker: abre pelo foco */
              }
            }}
            onChange={(e) => /^\d{4}-\d{2}$/.test(e.target.value) && setMonth(e.target.value)}
          />
        </label>
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
        {renda != null ? (
          <div className="sobra">
            <div className={`prev-real is-compact ${mostraPrevisto && mostraReal ? '' : 'is-single'}`}>
              {mostraPrevisto && <Sobra label="Sobra prevista" valor={renda - total.previsao} />}
              {mostraReal && <Sobra label="Sobra real" valor={renda - total.real} />}
            </div>
          </div>
        ) : (
          <button type="button" className="link sobra-link" onClick={() => go('#/ajustes')}>
            Informar renda para ver quanto sobra
          </button>
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
                <button type="button" className="cat-hit" onClick={() => goCategoria(c.id, month)}>
                  <div className="cat-row">
                    <span>{c.nome}</span>
                    <span className="num">
                      {money(c.valor)}
                      <span className="cat-chev" aria-hidden="true">›</span>
                    </span>
                  </div>
                  <Bar value={c.valor} max={maxCat} thin />
                </button>
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

/** Sobra = renda − despesas; negativo fica em destaque. */
function Sobra({ label, valor }: { label: string; valor: number }) {
  const { money } = usePrivacy();
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${valor < 0 ? 'is-neg' : ''}`}>{money(valor)}</span>
    </div>
  );
}
