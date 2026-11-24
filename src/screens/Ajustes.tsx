import { useState } from 'react';
import * as api from '../lib/api';
import { supabase } from '../lib/supabase';
import { todayISO } from '../lib/dates';
import { go } from '../lib/nav';
import type { Categoria } from '../lib/types';
import { BackHeader } from '../components/ui';
import type { ShowToast } from '../components/Toast';

interface Props {
  email: string;
  cats: Categoria[];
  onChanged: () => Promise<void>;
  toast: ShowToast;
}

export function Ajustes({ email, cats, onChanged, toast }: Props) {
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

  const backup = async () => {
    try {
      const json = await api.exportarBackup();
      const file = new File([json], `simplebalance-${todayISO()}.json`, { type: 'application/json' });
      // No iPhone, a folha de compartilhar permite "Salvar em Arquivos".
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast((err as Error).message, 'error');
    }
  };

  return (
    <main className="page">
      <BackHeader title="Ajustes" onBack={() => go('#/')} />

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
            <button type="button" className="row as-button" onClick={backup}>
              <span className="row-title">Exportar backup (JSON)</span>
            </button>
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
