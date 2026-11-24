import { useRegisterSW } from 'virtual:pwa-register/react';

/** Aviso de nova versão: o usuário decide quando atualizar. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg?.update();
      });
    },
  });

  if (!needRefresh) return null;
  return (
    <div className="toast" role="status">
      <span>Nova versão disponível</span>
      <button type="button" onClick={() => void updateServiceWorker(true)}>
        Atualizar
      </button>
    </div>
  );
}
