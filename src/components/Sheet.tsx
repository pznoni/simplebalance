import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

/**
 * Folha que sobe de baixo. Fecha tocando fora, no "Cancelar" ou puxando para baixo
 * (puxão rápido fecha; arrastar para cima tem resistência).
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      document.body.classList.add('has-sheet');
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    document.body.classList.remove('has-sheet');
    const t = window.setTimeout(() => setMounted(false), 380);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const onDown = (e: PointerEvent) => {
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    panel.current?.classList.add('is-dragging');
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || !panel.current) return;
    const raw = e.clientY - d.y;
    d.dy = raw > 0 ? raw : -Math.sqrt(-raw) * 3; // resistência para cima
    panel.current.style.transform = `translateY(${d.dy}px)`;
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !panel.current) return;
    panel.current.classList.remove('is-dragging');
    panel.current.style.transform = '';
    const velocity = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > 140 || (d.dy > 24 && velocity > 0.6)) onClose();
  };

  return (
    <div className={`sheet-root ${shown ? 'is-open' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grab" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="sheet-handle" />
          <div className="sheet-bar">
            <button type="button" className="link" onClick={onClose}>
              Cancelar
            </button>
            <h2>{title}</h2>
            <span className="sheet-bar-spacer" />
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
