import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatBRL } from './money';

/**
 * Ocultar valores: começa sempre oculto (não é salvo em lugar nenhum) e volta a
 * ocultar quando o app vai para segundo plano.
 */
interface Privacy {
  hidden: boolean;
  toggle: () => void;
  /** Formata centavos como "R$ 1.234,56", ou "R$ ••••" quando oculto. */
  money: (cents: number) => string;
}

const MASK = 'R$ ••••';

const PrivacyContext = createContext<Privacy>({ hidden: true, toggle: () => {}, money: () => MASK });

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const onVis = () => document.visibilityState === 'hidden' && setHidden(true);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const value = useMemo<Privacy>(
    () => ({
      hidden,
      toggle: () => setHidden((h) => !h),
      money: (cents) => (hidden ? MASK : formatBRL(cents)),
    }),
    [hidden],
  );
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export const usePrivacy = () => useContext(PrivacyContext);
