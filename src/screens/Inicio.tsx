import { addMonths, currentMonth, monthTitle } from '../lib/dates';
import { diffLabel, formatBRL } from '../lib/money';
import { porCategoria, resumo } from '../lib/calc';
import type { Categoria, Lancamento, Tipo } from '../lib/types';
import { Bar, PrevReal } from '../components/ui';
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

  return (
    <main className={`page ${loading ? 'is-loading' : ''}`}>
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
        <p className="muted small">
          {total.previsao === 0
            ? 'Nada lançado neste mês.'
            : total.falta === 0
              ? 'Tudo já caiu ou foi pago.'
              : `Faltam ${formatBRL(total.falta)} cair/pagar`}
        </p>
        {total.diferenca !== 0 && (
          <p className="muted small">Nos já resolvidos, o real ficou {diffLabel(total.diferenca)}.</p>
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
                  <span className="num">{formatBRL(c.valor)}</span>
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
