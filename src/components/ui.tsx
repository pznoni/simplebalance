import type { ReactNode } from 'react';
import { usePrivacy } from '../lib/privacy';

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? 'is-on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Círculo de status: vazio = pendente; preto com ✓ = resolvido. */
export function StatusCircle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`status ${on ? 'is-on' : ''}`}
      aria-pressed={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {on && (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/** Botão de olho: mostra/oculta os valores do app. */
export function EyeToggle() {
  const { hidden, toggle } = usePrivacy();
  return (
    <button
      type="button"
      className="eye"
      aria-pressed={!hidden}
      aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="3" />
        {hidden && <path d="M4 4l16 16" />}
      </svg>
    </button>
  );
}

/** Par Previsão / Real lado a lado. */
export function PrevReal({ previsao, real, compact = false }: { previsao: number; real: number; compact?: boolean }) {
  const { money } = usePrivacy();
  return (
    <div className={`prev-real ${compact ? 'is-compact' : ''}`}>
      <div className="stat">
        <span className="stat-label">Previsão</span>
        <span className="stat-value">{money(previsao)}</span>
        {!compact && <span className="stat-hint">tudo lançado</span>}
      </div>
      <div className="stat">
        <span className="stat-label">Real</span>
        <span className="stat-value">{money(real)}</span>
        {!compact && <span className="stat-hint">já caiu</span>}
      </div>
    </div>
  );
}

export function Bar({ value, max, thin = false }: { value: number; max: number; thin?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`bar ${thin ? 'is-thin' : ''}`} aria-hidden="true">
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function BackHeader({
  title,
  onBack,
  eye = false,
  children,
}: {
  title: string;
  onBack: () => void;
  eye?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head-bar">
        <button type="button" className="back" onClick={onBack}>
          <svg viewBox="0 0 12 20" aria-hidden="true">
            <path d="M10 2L2 10l8 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Início
        </button>
        {eye && <EyeToggle />}
      </div>
      <h1 className="title-xl">{title}</h1>
      {children}
    </header>
  );
}
