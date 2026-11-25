import { Fragment, useEffect, useState } from 'react';
import * as api from '../lib/api';
import { resumo, valorEfetivo } from '../lib/calc';
import { dayHeader, monthName } from '../lib/dates';
import { usePrivacy } from '../lib/privacy';
import { PAGAMENTO_LABEL, TIPO_LABEL, statusLabel, type Categoria as Cat, type Lancamento } from '../lib/types';
import { BackHeader, PrevReal, StatusCircle } from '../components/ui';
import type { ShowToast } from '../components/Toast';
import './Categoria.css';

/** "sem" na rota = lançamentos sem categoria (ou de categoria apagada). */
export const SEM_CATEGORIA = 'sem';

interface Props {
  catId: string; // id da categoria ou SEM_CATEGORIA
  ym: string; // mês (ciclo) mostrado
  from: 'inicio' | 'estatisticas';
  cats: Cat[];
  version: number; // muda quando algo foi salvo fora daqui (folha de edição)
  onEdit: (l: Lancamento) => void;
  onChanged: () => void; // avisa o app para atualizar o Início
  toast: ShowToast;
}

export function Categoria({ catId, ym, from, cats, version, onEdit, onChanged, toast }: Props) {
  const { money } = usePrivacy();
  const [lancs, setLancs] = useState<Lancamento[] | null>(null);
  const existe = new Set(cats.map((c) => c.id));
  const nome = catId === SEM_CATEGORIA ? 'Sem categoria' : cats.find((c) => c.id === catId)?.nome ?? 'Categoria';
  const mes = monthName(ym);

  useEffect(() => {
    let vivo = true;
    api
      .listarMes(ym)
      .then((l) => vivo && setLancs(l))
      .catch((err: Error) => vivo && toast(err.message, 'error'));
    return () => {
      vivo = false;
    };
  }, [ym, version, toast]);

  const daCategoria = (lancs ?? []).filter((l) =>
    catId === SEM_CATEGORIA ? !l.categoria_id || !existe.has(l.categoria_id) : l.categoria_id === catId,
  );
  const r = resumo(daCategoria);

  /** Alterna o status na hora (otimista) e desfaz se o banco recusar. */
  const toggle = async (l: Lancamento) => {
    const next = !l.resolvido;
    const troca = (v: boolean) => setLancs((list) => list?.map((x) => (x.id === l.id ? { ...x, resolvido: v } : x)) ?? null);
    troca(next);
    try {
      await api.marcarResolvido(l.id, next);
      onChanged();
    } catch (err) {
      troca(!next);
      toast((err as Error).message, 'error');
    }
  };

  // Mais recente primeiro, agrupado por dia.
  const porDia = new Map<string, Lancamento[]>();
  for (const l of [...daCategoria].sort((a, b) => b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at))) {
    porDia.set(l.data, [...(porDia.get(l.data) ?? []), l]);
  }

  return (
    <main className={`page ${lancs ? '' : 'is-loading'}`}>
      <BackHeader
        title={nome}
        onBack={() => history.back()}
        backLabel={from === 'estatisticas' ? 'Estatísticas' : 'Início'}
        eye
      >
        <p className="muted small">{mes.charAt(0).toUpperCase() + mes.slice(1)}</p>
      </BackHeader>

      <section className="card">
        <PrevReal previsao={r.previsao} real={r.real} compact />
      </section>

      {[...porDia].map(([data, itens]) => (
        <section key={data} className="card list-card">
          <header className="list-head">
            <span>{dayHeader(data)}</span>
            <span className="num">{money(itens.reduce((s, l) => s + valorEfetivo(l), 0))}</span>
          </header>
          <ul className="rows">
            {itens.map((l) => (
              <li key={l.id}>
                <div className="row">
                  <StatusCircle
                    on={l.resolvido}
                    label={`${l.descricao}: marcar como ${l.resolvido ? 'pendente' : 'resolvido'}`}
                    onClick={() => void toggle(l)}
                  />
                  <button type="button" className="row-hit" onClick={() => onEdit(l)}>
                    <div className="row-main">
                      <span className="row-title">{l.descricao}</span>
                      <span className="row-sub">
                        {[TIPO_LABEL[l.tipo], PAGAMENTO_LABEL[l.pagamento], statusLabel(l)].map((part, i) => (
                          <Fragment key={i}>
                            {i > 0 && ' · '}
                            <span className="nowrap">{part}</span>
                          </Fragment>
                        ))}
                      </span>
                    </div>
                    <span className="row-value num">
                      {money(valorEfetivo(l))}
                      {valorEfetivo(l) !== l.valor && (
                        <span className="row-prev" aria-label={`previsto ${money(l.valor)}`}>
                          {money(l.valor)}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {lancs && daCategoria.length === 0 && (
        <div className="empty">
          <p className="muted">Nenhum lançamento em {nome} neste mês.</p>
        </div>
      )}
    </main>
  );
}
