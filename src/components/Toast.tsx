import { useCallback, useMemo, useRef, useState } from 'react';

type Kind = 'info' | 'error';
interface ToastMsg {
  id: number;
  text: string;
  kind: Kind;
  action?: { label: string; onClick: () => void };
}

export type ShowToast = (text: string, kind?: Kind, action?: ToastMsg['action'], ms?: number) => void;

export function useToast() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback<ShowToast>((text, kind = 'info', action, ms = 3200) => {
    window.clearTimeout(timer.current);
    setMsg({ id: Date.now(), text, kind, action });
    timer.current = window.setTimeout(() => setMsg(null), ms);
  }, []);

  const hide = useCallback(() => setMsg(null), []);
  return useMemo(() => ({ show, props: { msg, hide } }), [show, msg, hide]);
}

export function Toast({ msg, hide }: { msg: ToastMsg | null; hide: () => void }) {
  if (!msg) return null;
  return (
    <div key={msg.id} className={`toast ${msg.kind === 'error' ? 'is-error' : ''}`} role="status">
      <span>{msg.text}</span>
      {msg.action && (
        <button
          type="button"
          onClick={() => {
            msg.action?.onClick();
            hide();
          }}
        >
          {msg.action.label}
        </button>
      )}
    </div>
  );
}
