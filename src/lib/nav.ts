/** Navegação por hash: "#/" (início), "#/fixo", "#/variavel", "#/ajustes". */
export const go = (hash: string) => {
  location.hash = hash;
};
