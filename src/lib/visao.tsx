import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * O que os quadros de valores mostram: previsto e real lado a lado, só o real ou só o previsto.
 * Um toque no botão passa para o próximo modo. Fica lembrado neste aparelho.
 */
export type Visao = 'ambos' | 'real' | 'previsto';

const ORDEM: Visao[] = ['ambos', 'real', 'previsto'];
const KEY = 'simplebalance.visao';

export const proximaVisao = (v: Visao): Visao => ORDEM[(ORDEM.indexOf(v) + 1) % ORDEM.length]!;

function lerVisao(): Visao {
  try {
    const v = localStorage.getItem(KEY);
    if (v && (ORDEM as string[]).includes(v)) return v as Visao;
  } catch {
    /* sem armazenamento: começa com os dois */
  }
  return 'ambos';
}

interface Ctx {
  visao: Visao;
  avancar: () => void;
  mostraPrevisto: boolean;
  mostraReal: boolean;
}

const VisaoContext = createContext<Ctx>({ visao: 'ambos', avancar: () => {}, mostraPrevisto: true, mostraReal: true });

export function VisaoProvider({ children }: { children: ReactNode }) {
  const [visao, setVisao] = useState<Visao>(lerVisao);
  const value = useMemo<Ctx>(
    () => ({
      visao,
      avancar: () =>
        setVisao((v) => {
          const n = proximaVisao(v);
          try {
            localStorage.setItem(KEY, n);
          } catch {
            /* ignora */
          }
          return n;
        }),
      mostraPrevisto: visao !== 'real',
      mostraReal: visao !== 'previsto',
    }),
    [visao],
  );
  return <VisaoContext.Provider value={value}>{children}</VisaoContext.Provider>;
}

export const useVisao = () => useContext(VisaoContext);
