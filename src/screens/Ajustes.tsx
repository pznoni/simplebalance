import { useState } from 'react';
import * as api from '../lib/api';
import { supabase } from '../lib/supabase';
import { todayISO } from '../lib/dates';
import { salvarFechamento, salvarRenda, useRenda } from '../lib/prefs';
import { formatBRL, parseMoney } from '../lib/money';
import { go } from '../lib/nav';
import type { Categoria } from '../lib/types';
import { BackHeader } from '../components/ui';
import type { ShowToast } from '../components/Toast';

interface Props {
  email: string;
  cats: Categoria[];
  fechamento?: number | null;
  onFechamento?: (dia: number | null) => void;
  onChanged: () => Promise<void>;
  toast: ShowToast;
}

export function Ajustes({ email, cats, fechamento = null, onFechamento = () => {}, onChanged, toast }: Props) {
  const [savingFech, setSavingFech] = useState(false);
  const mudarFechamento = async (dia: number | null) => {
    setSavingFech(true);
    try {
      await salvarFechamento(dia);
      onFechamento(dia);
      toast(dia ? `Fechamento no dia ${dia}.` : 'Mês do calendário.');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSavingFech(false);
    }
  };
  // Renda mensal: edita como texto e salva ao sair do campo (ou Enter).
  const renda = useRenda();
  const [rendaTxt, setRendaTxt] = useState<string | null>(null); // null = mostrando o valor salvo
  const salvarRendaTxt = async () => {
    if (rendaTxt === null) return;
    const txt = rendaTxt.trim();
    const valor = txt === '' ? null : parseMoney(txt);
    if (valor !== null && !(valor >= 0)) {
      toast('Valor da renda inválido.', 'error');
      return;
    }
    setRendaTxt(null);
    if (valor === renda) return;
    try {
      await salvarRenda(valor);
      toast(valor === null ? 'Renda removida.' : 'Renda salva.');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };
  const [nova, setNova] = useState('');
  const [editing, setEditing] = useState<{ id: string; nome: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      await onChanged();
      if (ok) toast(ok);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  // Backup em dois toques: o navegador só abre a folha de compartilhar logo após um toque,
  // e buscar os dados antes disso faz ele recusar ("Permission denied").
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [preparing, setPreparing] = useState(false);

  const prepararBackup = async () => {
    setPreparing(true);
    try {
      const json = await api.exportarBackup();
      setBackupFile(new File([json], `simplebalance-${todayISO()}.json`, { type: 'application/json' }));
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setPreparing(false);
    }
  };

  const baixar = (file: File) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const salvarBackup = () => {
    const file = backupFile;
    if (!file) return;
    // Chamado direto no toque. No iPhone, a folha de compartilhar tem "Salvar em Arquivos".
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file] }).then(
        () => setBackupFile(null),
        (err: Error) => {
          if (err.name === 'AbortError') return; // usuário fechou a folha
          baixar(file);
          setBackupFile(null);
        },
      );
    } else {
      baixar(file);
      setBackupFile(null);
    }
  };

  return (
    <main className="page">
      <BackHeader title="Ajustes" onBack={() => go('#/')} />

      <section className="card list-card">
        <ul className="rows">
          <li>
            <label className="row row-edit row-select">
              <span className="row-title">Dia de fechamento</span>
              <select
                value={fechamento ?? ''}
                disabled={savingFech}
                onChange={(e) => void mudarFechamento(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Fim do mês</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Dia {d}
                  </option>
                ))}
              </select>
            </label>
          </li>
          <li>
            <label className="row row-edit row-input">
              <span className="row-title">Renda mensal</span>
              <input
                className="renda-input num"
                inputMode="decimal"
                placeholder="R$ 0,00"
                aria-label="Renda mensal"
                value={rendaTxt ?? (renda != null ? formatBRL(renda) : '')}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRendaTxt(e.target.value)}
                onBlur={() => void salvarRendaTxt()}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            </label>
          </li>
        </ul>
      </section>
      <p className="muted small pad-x">
        {fechamento
          ? `O mês vai do dia ${fechamento + 1} ao dia ${fechamento}. Lançamentos depois do dia ${fechamento} entram no mês seguinte.`
          : 'O mês vai do dia 1 ao último dia do mês.'}{' '}
        A renda mensal é usada para mostrar quanto sobra no Início.
      </p>

      <section className="card list-card">
        <header className="list-head">
          <span>Categorias</span>
        </header>
        <ul className="rows">
          {cats.map((c) => (
            <li key={c.id}>
              {editing?.id === c.id ? (
                <form
                  className="row row-edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const nome = editing.nome.trim();
                    setEditing(null);
                    if (nome && nome !== c.nome) void run(() => api.renomearCategoria(c.id, nome));
                  }}
                >
                  <input autoFocus value={editing.nome} maxLength={40} onChange={(e) => setEditing({ id: c.id, nome: e.target.value })} />
                  <button type="submit" className="link">
                    OK
                  </button>
                </form>
              ) : (
                <div className="row">
                  <button type="button" className="row-main as-button" onClick={() => setEditing({ id: c.id, nome: c.nome })}>
                    <span className="row-title">{c.nome}</span>
                  </button>
                  <button
                    type="button"
                    className={`link ${confirmId === c.id ? 'is-danger' : 'muted'}`}
                    onClick={() => {
                      if (confirmId !== c.id) return setConfirmId(c.id);
                      setConfirmId(null);
                      void run(() => api.excluirCategoria(c.id), `"${c.nome}" excluída.`);
                    }}
                  >
                    {confirmId === c.id ? 'Excluir?' : 'Remover'}
                  </button>
                </div>
              )}
            </li>
          ))}
          <li>
            <form
              className="row row-edit"
              onSubmit={(e) => {
                e.preventDefault();
                const nome = nova.trim();
                if (!nome) return;
                setNova('');
                void run(() => api.criarCategoria(nome, (cats.at(-1)?.ordem ?? 0) + 1));
              }}
            >
              <input value={nova} maxLength={40} placeholder="Nova categoria" onChange={(e) => setNova(e.target.value)} />
              <button type="submit" className="link" disabled={!nova.trim()}>
                Adicionar
              </button>
            </form>
          </li>
        </ul>
      </section>
      <p className="muted small pad-x">Toque no nome para renomear. Lançamentos de uma categoria removida ficam "Sem categoria".</p>

      <section className="card list-card">
        <ul className="rows">
          <li>
            {backupFile ? (
              <button type="button" className="row as-button" onClick={salvarBackup}>
                <span className="row-title">Salvar backup</span>
                <span className="muted small">{backupFile.name}</span>
              </button>
            ) : (
              <button type="button" className="row as-button" onClick={prepararBackup} disabled={preparing}>
                <span className="row-title">{preparing ? 'Preparando backup…' : 'Exportar backup (JSON)'}</span>
              </button>
            )}
          </li>
          <li>
            <button type="button" className="row as-button" onClick={() => void supabase.auth.signOut()}>
              <span className="row-title">Sair</span>
              <span className="muted small">{email}</span>
            </button>
          </li>
        </ul>
      </section>
    </main>
  );
}
