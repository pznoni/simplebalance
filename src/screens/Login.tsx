import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { traduz } from '../lib/api';

/** E-mail e senha (link mágico abre o Safari e não o app instalado no iPhone). */
export function Login() {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  // No `npm run dev`, preenche com a conta de teste do .env.development.local.
  const [email, setEmail] = useState(import.meta.env.DEV ? (import.meta.env.VITE_DEV_EMAIL ?? '') : '');
  const [senha, setSenha] = useState(import.meta.env.DEV ? (import.meta.env.VITE_DEV_PASSWORD ?? '') : '');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setBusy(true);
    const { error } =
      mode === 'entrar'
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({ email, password: senha });
    setBusy(false);
    if (error) setErro(traduz(error.message));
  };

  return (
    <main className="login">
      <h1 className="title-xl">Simple Balance</h1>
      <p className="muted">Seu dinheiro do mês, sem complicação.</p>
      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>E-mail</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'criar' ? 10 : undefined}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        {erro && <p className="error-text">{erro}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
      <button type="button" className="link" onClick={() => setMode(mode === 'entrar' ? 'criar' : 'entrar')}>
        {mode === 'entrar' ? 'Primeira vez? Criar conta' : 'Já tenho conta'}
      </button>
    </main>
  );
}
