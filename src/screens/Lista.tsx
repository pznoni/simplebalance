import { Fragment, useState } from 'react';
import * as api from '../lib/api';
import { resumo } from '../lib/calc';
import { addMonths, dayHeader, monthName } from '../lib/dates';
import { formatBRL } from '../lib/money';
import { PAGAMENTO_LABEL, TIPO_LABEL, statusLabel, type Categoria, type Lancamento, type Tipo } from '../lib/types';
import { BackHeader, PrevReal, Segmented, StatusCircle } from '../components/ui';
import type { ShowToast } from '../components/Toast';
import { go } from '../lib/nav';

type Filtro = 'todos' | 'pendentes' | 'pagos';
const FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'pagos', label: 'Pagos' },
] as const;

interface Props {
  tipo: Tipo;
  month: string;
  lancs: Lancamento[];
  cats: Categoria[];
  loading: boolean;
  onToggle: (l: Lancamento) => void;
  onNew: () => void;
  onEdit: (l: Lancamento) => void;
  onCopied: () => Promise<void>;
  toast: ShowToast;
}

interface Grupo {
  key: string;
  titulo: string;
  itens: Lancamento[];
}

export function Lista({ tipo, month, lancs, cats, loading, onToggle, onNew, onEdit, onCopied, toast }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [copying, setCopying] = useState(false);
  const r = resumo(lancs);
  const catNome = new Map(cats.map((c) => [c.id, c.nome]));

  const visiveis = lancs.filter((l) =>
    filtro === 'todos' ? true : filtro === 'pagos' ? l.resolvido : !l.resolvido,
  );

  const grupos: Grupo[] =
    tipo === 'fixo'
      ? [
          { key: 'p', titulo: 'Pendentes', itens: visiveis.filter((l) => !l.resolvido).sort(porVencimento) },
          { key: 'r', titulo: 'Resolvidos', itens: visiveis.filter((l) => l.resolvido).sort(porVencimento) },
        ].filter((g) => g.itens.length)
      : porDia(visiveis);

  const copiar = async () => {
    setCopying(true);
    try {
      const n = await api.copiarFixosDoMesAnterior(month);
      if (n === 0) toast(`Nenhum fixo em ${monthName(addMonths(month, -1))}.`);
      else {
        toast(`${n} ${n === 1 ? 'fixo copiado' : 'fixos copiados'}.`);
        await onCopied();
      }
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setCopying(false);
    }
  };

  return (
    <main className={`page ${loading ? 'is-loading' : ''}`}>
      <BackHeader title={TIPO_LABEL[tipo]} onBack={() => go('#/')} />

      <section className="card">
        <PrevReal previsao={r.previsao} real={r.real} compact />
      </section>

      <Segmented label="Filtro" value={filtro} options={FILTROS} onChange={setFiltro} />

      <button type="button" className="btn-primary btn-wide" onClick={onNew}>
        + Novo lançamento
      </button>

      {grupos.map((g) => (
        <section key={g.key} className="card list-card">
          <header className="list-head">
            <span>{g.titulo}</span>
            <span className="num">{formatBRL(g.itens.reduce((s, l) => s + l.valor, 0))}</span>
          </header>
          <ul className="rows">
            {g.itens.map((l) => (
              <li key={l.id}>
                <div className="row">
                  <StatusCircle
                    on={l.resolvido}
                    label={`${l.descricao}: marcar como ${l.resolvido ? 'pendente' : 'resolvido'}`}
                    onClick={() => onToggle(l)}
                  />
                  <button type="button" className="row-hit" onClick={() => onEdit(l)}>
                  <div className="row-main">
                    <span className="row-title">{l.descricao}</span>
                    <span className="row-sub">
                      {[
                        (l.categoria_id && catNome.get(l.categoria_id)) || 'Sem categoria',
                        PAGAMENTO_LABEL[l.pagamento],
                        statusLabel(l),
                      ]
                        .filter(Boolean)
                        .map((part, i) => (
                          <Fragment key={i}>
                            {i > 0 && ' · '}
                            <span className="nowrap">{part}</span>
                          </Fragment>
                        ))}
                    </span>
                  </div>
                  <span className="row-value num">{formatBRL(l.valor)}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!loading && grupos.length === 0 && (
        <div className="empty">
          <p className="muted">
            {lancs.length === 0 ? `Nenhum lançamento ${tipo === 'fixo' ? 'fixo' : 'variável'} neste mês.` : 'Nada neste filtro.'}
          </p>
          {tipo === 'fixo' && lancs.length === 0 && (
            <button type="button" className="btn-secondary" onClick={copiar} disabled={copying}>
              {copying ? 'Copiando…' : `Copiar fixos de ${monthName(addMonths(month, -1))}`}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

const porVencimento = (a: Lancamento, b: Lancamento) => a.data.localeCompare(b.data) || a.descricao.localeCompare(b.descricao, 'pt-BR');

/** Variável: blocos por dia, do mais recente para o mais antigo. */
function porDia(list: Lancamento[]): Grupo[] {
  const map = new Map<string, Lancamento[]>();
  for (const l of [...list].sort((a, b) => b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at))) {
    map.set(l.data, [...(map.get(l.data) ?? []), l]);
  }
  return [...map].map(([data, itens]) => ({ key: data, titulo: dayHeader(data), itens }));
}
