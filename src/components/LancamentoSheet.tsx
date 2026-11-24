import { useEffect, useRef, useState, type FormEvent } from 'react';
import * as api from '../lib/api';
import { currentMonth, todayISO } from '../lib/dates';
import { centsToInput, formatBRL, parseMoney } from '../lib/money';
import type { Categoria, Lancamento, Pagamento, Tipo } from '../lib/types';
import { Sheet } from './Sheet';
import { Segmented } from './ui';
import type { ShowToast } from './Toast';

export type SheetState = { tipo: Tipo; editing?: Lancamento } | null;

const TIPOS = [
  { value: 'fixo', label: 'Fixo' },
  { value: 'variavel', label: 'Variável' },
] as const;
const PAGAMENTOS = [
  { value: 'credito', label: 'Crédito' },
  { value: 'debito', label: 'Débito' },
] as const;

interface Props {
  state: SheetState;
  month: string;
  cats: Categoria[];
  onClose: () => void;
  onSaved: () => void;
  onCatsChanged: (cats: Categoria[]) => void;
  toast: ShowToast;
}

export function LancamentoSheet({ state, month, cats, onClose, onSaved, onCatsChanged, toast }: Props) {
  // Guarda o último estado para o formulário não sumir durante a animação de saída.
  const last = useRef(state);
  if (state) last.current = state;
  const s = last.current;

  return (
    <Sheet open={Boolean(state)} onClose={onClose} title={s?.editing ? 'Editar lançamento' : 'Novo lançamento'}>
      {s && (
        <Form
          key={s.editing?.id ?? `novo-${s.tipo}-${Boolean(state)}`}
          initial={s}
          month={month}
          cats={cats}
          onSaved={onSaved}
          onCatsChanged={onCatsChanged}
          toast={toast}
        />
      )}
    </Sheet>
  );
}

function defaultDate(month: string): string {
  return month === currentMonth() ? todayISO() : `${month}-01`;
}

function Form({
  initial,
  month,
  cats,
  onSaved,
  onCatsChanged,
  toast,
}: {
  initial: NonNullable<SheetState>;
  month: string;
  cats: Categoria[];
  onSaved: () => void;
  onCatsChanged: (cats: Categoria[]) => void;
  toast: ShowToast;
}) {
  const e = initial.editing;
  const [tipo, setTipo] = useState<Tipo>(e?.tipo ?? initial.tipo);
  const [valor, setValor] = useState(e ? centsToInput(e.valor) : '');
  const [descricao, setDescricao] = useState(e?.descricao ?? '');
  const [categoriaId, setCategoriaId] = useState<string | null>(e?.categoria_id ?? null);
  const [pagamento, setPagamento] = useState<Pagamento>(e?.pagamento ?? 'debito');
  const [data, setData] = useState(e?.data ?? defaultDate(month));
  const [resolvido, setResolvido] = useState(e?.resolvido ?? false);
  const [novaCat, setNovaCat] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const valorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!e) {
      const t = window.setTimeout(() => valorRef.current?.focus(), 350);
      return () => window.clearTimeout(t);
    }
  }, [e]);

  const cents = parseMoney(valor);

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!(cents > 0)) return setErro('Digite um valor maior que zero.');
    if (!descricao.trim()) return setErro('Digite uma descrição.');
    if (!data) return setErro(`Escolha ${tipo === 'fixo' ? 'o vencimento' : 'a data'}.`);
    setErro('');
    setBusy(true);
    try {
      await api.salvarLancamento(
        { tipo, valor: cents, descricao: descricao.trim(), data, categoria_id: categoriaId, pagamento, resolvido },
        e?.id,
      );
      if (data.slice(0, 7) !== month) toast(`Salvo em ${data.slice(8, 10)}/${data.slice(5, 7)}, fora do mês em exibição.`);
      onSaved();
    } catch (err) {
      setErro((err as Error).message);
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!e) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    try {
      await api.excluirLancamento(e.id);
      onSaved();
    } catch (err) {
      setErro((err as Error).message);
      setBusy(false);
    }
  };

  const addCat = async () => {
    const nome = novaCat?.trim();
    if (!nome) return setNovaCat(null);
    try {
      const c = await api.criarCategoria(nome, (cats.at(-1)?.ordem ?? 0) + 1);
      onCatsChanged([...cats, c]);
      setCategoriaId(c.id);
      setNovaCat(null);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <form className="form sheet-form" onSubmit={submit}>
      <Segmented label="Tipo" value={tipo} options={TIPOS} onChange={setTipo} />

      <label className="amount">
        <span className="visually-hidden">Valor</span>
        <span className="amount-prefix">R$</span>
        <input
          ref={valorRef}
          inputMode="decimal"
          placeholder="0,00"
          value={valor}
          onChange={(ev) => setValor(ev.target.value)}
          style={{ width: `${Math.max(4, valor.length) + 0.5}ch` }}
          aria-invalid={valor !== '' && !(cents > 0)}
        />
      </label>
      {valor !== '' && cents > 0 && <p className="amount-echo muted small">{formatBRL(cents)}</p>}

      <label className="field">
        <span>Descrição</span>
        <input value={descricao} maxLength={80} placeholder={tipo === 'fixo' ? 'Aluguel, internet…' : 'Mercado, almoço…'} onChange={(ev) => setDescricao(ev.target.value)} />
      </label>

      <div className="field">
        <span>Categoria</span>
        <div className="chips">
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${categoriaId === c.id ? 'is-on' : ''}`}
              aria-pressed={categoriaId === c.id}
              onClick={() => setCategoriaId(categoriaId === c.id ? null : c.id)}
            >
              {c.nome}
            </button>
          ))}
          {novaCat === null ? (
            <button type="button" className="chip chip-add" aria-label="Nova categoria" onClick={() => setNovaCat('')}>
              +
            </button>
          ) : (
            <span className="chip-new">
              <input
                autoFocus
                value={novaCat}
                maxLength={40}
                placeholder="Nova categoria"
                onChange={(ev) => setNovaCat(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') {
                    ev.preventDefault();
                    void addCat();
                  }
                  if (ev.key === 'Escape') setNovaCat(null);
                }}
              />
              <button type="button" className="link" onClick={() => void addCat()}>
                OK
              </button>
            </span>
          )}
        </div>
      </div>

      <div className="field">
        <span>Pagamento</span>
        <Segmented label="Pagamento" value={pagamento} options={PAGAMENTOS} onChange={setPagamento} />
      </div>

      <label className="field">
        <span>{tipo === 'fixo' ? 'Vencimento' : 'Data'}</span>
        <input type="date" value={data} required onChange={(ev) => setData(ev.target.value)} />
      </label>

      <label className="switch-row">
        <span>{pagamento === 'debito' ? 'Já pago?' : 'Já caiu na fatura?'}</span>
        <input type="checkbox" role="switch" className="switch" checked={resolvido} onChange={(ev) => setResolvido(ev.target.checked)} />
      </label>

      {erro && <p className="error-text">{erro}</p>}

      <button type="submit" className="btn-primary btn-wide" disabled={busy}>
        {busy ? 'Salvando…' : 'Salvar'}
      </button>
      {e && (
        <button type="button" className="btn-danger btn-wide" onClick={remove} disabled={busy}>
          {confirmDelete ? 'Toque de novo para excluir' : 'Excluir lançamento'}
        </button>
      )}
    </form>
  );
}
