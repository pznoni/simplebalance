import { useEffect, useMemo, useState } from 'react';
import * as api from '../lib/api';
import { currentMonth, monthName } from '../lib/dates';
import { usePrivacy } from '../lib/privacy';
import { compararCategorias, diferencas, mediaReal, mesesAte, porMes, variacao } from '../lib/stats';
import type { Categoria, Lancamento } from '../lib/types';
import { BackHeader } from '../components/ui';
import type { ShowToast } from '../components/Toast';
import { go } from '../lib/nav';
import './Estatisticas.css';

const N_MESES = 6;

interface Props {
  month: string; // último mês do período (o que está no Início)
  cats: Categoria[];
  toast: ShowToast;
}

const curto = (ym: string) => {
  const n = monthName(ym).slice(0, 3);
  return n.charAt(0).toUpperCase() + n.slice(1);
};
const longo = (ym: string) => {
  const n = monthName(ym);
  return n.charAt(0).toUpperCase() + n.slice(1);
};

/** Variação de gasto: subir é ruim (vermelho); a seta e o texto dizem o sentido, não só a cor. */
function Delta({ valor, pct, sufixo }: { valor: string; pct: number | null; sufixo?: string }) {
  const { hidden } = usePrivacy();
  const sinal = pct === null ? 0 : Math.sign(pct);
  const seta = sinal > 0 ? '▲' : sinal < 0 ? '▼' : '=';
  const p = pct === null ? '' : ` · ${Math.abs(pct)}%`;
  return (
    <span className={`delta ${sinal > 0 ? 'is-up' : ''}`}>
      {seta} {sinal === 0 && pct !== null ? 'igual' : `${hidden ? '••' : valor}${p}`}
      {sufixo ? ` ${sufixo}` : ''}
    </span>
  );
}

export function Estatisticas({ month, cats, toast }: Props) {
  const { money } = usePrivacy();
  const [lancs, setLancs] = useState<Lancamento[] | null>(null);
  const [sel, setSel] = useState(month);

  // Busca um mês a mais para comparar o primeiro mostrado com o anterior dele.
  const todos = useMemo(() => mesesAte(month, N_MESES + 1), [month]);
  const visiveis = todos.slice(1);

  useEffect(() => {
    let vivo = true;
    setLancs(null);
    setSel(month);
    api
      .listarPeriodo(todos[0]!, month)
      .then((l) => vivo && setLancs(l))
      .catch((err: Error) => vivo && toast(err.message, 'error'));
    return () => {
      vivo = false;
    };
  }, [month, todos, toast]);

  const list = lancs ?? [];
  const meses = porMes(list, todos);
  const mostrados = meses.slice(1);
  const atual = meses.find((m) => m.ym === sel)!;
  const anterior = meses[meses.indexOf(atual) - 1]!;
  const media = mediaReal(mostrados, sel);
  const max = Math.max(1, ...mostrados.map((m) => Math.max(m.previsto, m.real)));
  const categorias = compararCategorias(list, sel, cats);
  const maxCat = Math.max(1, ...categorias.map((c) => Math.max(c.atual, c.anterior)));
  const difs = diferencas(list, sel);
  const totalTipo = atual.fixo + atual.variavel;
  const emAndamento = sel === currentMonth();

  return (
    <main className={`page stats ${lancs ? '' : 'is-loading'}`}>
      <BackHeader title="Estatísticas" onBack={() => go('#/')} eye />

      <div className="stats-chips" role="radiogroup" aria-label="Mês">
        {visiveis.map((ym) => (
          <button
            key={ym}
            type="button"
            role="radio"
            aria-checked={ym === sel}
            className={`chip ${ym === sel ? 'is-on' : ''}`}
            onClick={() => setSel(ym)}
          >
            {curto(ym)}
          </button>
        ))}
      </div>

      <section className="card">
        <h2 className="card-title">Gasto por mês</h2>
        <div className="cols">
          {media !== null && (
            <div className="avg-line" style={{ bottom: `calc(var(--cols-label) + ${media / max} * (100% - var(--cols-label)))` }} />
          )}
          {mostrados.map((m) => (
            <button
              key={m.ym}
              type="button"
              className={`col ${m.ym === sel ? 'is-sel' : ''}`}
              aria-label={`${longo(m.ym)}: real ${money(m.real)} de ${money(m.previsto)} previsto`}
              onClick={() => setSel(m.ym)}
            >
              <span className="col-plot">
                <span className="col-track" style={{ height: `${(m.previsto / max) * 100}%` }}>
                  <span className="col-fill" style={{ height: `${m.previsto ? Math.min(100, (m.real / m.previsto) * 100) : 0}%` }} />
                </span>
              </span>
              <span className="col-lbl">{curto(m.ym)}</span>
            </button>
          ))}
        </div>
        <div className="legend">
          <span><i className="sw-real" />Real</span>
          <span><i className="sw-prev" />Previsto</span>
          {media !== null && <span><i className="sw-avg" />Média</span>}
        </div>
        <div className="prev-real">
          <div className="stat">
            <span className="stat-label">{longo(sel)} · real</span>
            <span className="stat-value">{money(atual.real)}</span>
            <span className="stat-hint">previsto {money(atual.previsto)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">vs média dos outros meses</span>
            {media === null ? (
              <span className="stat-value">—</span>
            ) : (
              <>
                <span className="stat-value">{money(media)}</span>
                <Delta valor={money(Math.abs(atual.real - media))} pct={variacao(atual.real, media)} />
              </>
            )}
          </div>
        </div>
        {emAndamento && <p className="muted small">{longo(sel)} ainda está em andamento: o real cresce conforme as contas caem.</p>}
      </section>

      <section className="card">
        <div className="stats-head">
          <h2 className="card-title">Categorias</h2>
          <span className="muted small">
            {curto(sel)} vs {curto(anterior.ym)}
          </span>
        </div>
        {categorias.length === 0 ? (
          <p className="muted small">Sem lançamentos nesses dois meses.</p>
        ) : (
          <ul className="cat-cmp">
            {categorias.map((c) => (
              <li key={c.id ?? 'none'}>
                <div className="cat-cmp-row">
                  <span className="cat-cmp-nome">{c.nome}</span>
                  <span className="cat-cmp-val num">
                    {money(c.atual)}
                    <Delta valor={money(Math.abs(c.delta))} pct={c.anterior ? variacao(c.atual, c.anterior) : c.atual ? null : 0} />
                  </span>
                </div>
                <div className="cat-cmp-bars" aria-hidden="true">
                  <span className="hbar"><span className="hbar-fill" style={{ width: `${(c.atual / maxCat) * 100}%` }} /></span>
                  <span className="hbar is-prev"><span className="hbar-fill" style={{ width: `${(c.anterior / maxCat) * 100}%` }} /></span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="legend">
          <span><i className="sw-real" />{curto(sel)}</span>
          <span><i className="sw-prev-strong" />{curto(anterior.ym)}</span>
          <span>pela maior mudança</span>
        </div>
      </section>

      <section className="card">
        <div className="stats-head">
          <h2 className="card-title">Previsto × real</h2>
          <span className="muted small">só resolvidos</span>
        </div>
        <div className="prev-real">
          <div className="stat">
            <span className="stat-label">Diferença total</span>
            <span className="stat-value">{money(Math.abs(difs.total))}</span>
            {difs.total !== 0 && (
              <span className={`delta ${difs.total > 0 ? 'is-up' : ''}`}>
                {difs.total > 0 ? '▲ acima' : '▼ abaixo'} do previsto
              </span>
            )}
          </div>
          <div className="stat">
            <span className="stat-label">Bateram certinho</span>
            <span className="stat-value">
              {difs.exatos} de {difs.resolvidos}
            </span>
            <span className="stat-hint">lançamentos resolvidos</span>
          </div>
        </div>
        {difs.itens.length > 0 && (
          <ul className="dif-list">
            {difs.itens.slice(0, 8).map(({ lanc, delta }) => (
              <li key={lanc.id}>
                <span className="dif-main">
                  <span className="dif-nome">{lanc.descricao}</span>
                  <span className="muted small">{(lanc.categoria_id && cats.find((c) => c.id === lanc.categoria_id)?.nome) || 'Sem categoria'}</span>
                </span>
                <span className="dif-val num">
                  <span>{money(lanc.valor + delta)}</span>
                  <span className="dif-prev">{money(lanc.valor)}</span>
                  <Delta valor={money(Math.abs(delta))} pct={variacao(lanc.valor + delta, lanc.valor)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="stats-head">
          <h2 className="card-title">Fixo × Variável</h2>
          <span className="muted small">{longo(sel)}</span>
        </div>
        <div className="split" aria-hidden="true">
          {atual.fixo > 0 && <span className="split-fixo" style={{ flexGrow: atual.fixo }} />}
          {atual.variavel > 0 && <span className="split-var" style={{ flexGrow: atual.variavel }} />}
          {totalTipo === 0 && <span className="split-vazio" />}
        </div>
        <div className="prev-real">
          <div className="stat">
            <span className="stat-label"><i className="sw-real" />Fixo</span>
            <span className="stat-value">{money(atual.fixo)}</span>
            <span className="stat-hint">{totalTipo ? Math.round((atual.fixo / totalTipo) * 100) : 0}% do mês</span>
          </div>
          <div className="stat">
            <span className="stat-label"><i className="sw-prev-strong" />Variável</span>
            <span className="stat-value">{money(atual.variavel)}</span>
            <Delta
              valor={money(Math.abs(atual.variavel - anterior.variavel))}
              pct={variacao(atual.variavel, anterior.variavel)}
              sufixo={`vs ${curto(anterior.ym)}`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
