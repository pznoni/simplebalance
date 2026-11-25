/** Navegação por hash: "#/" (início), "#/fixo", "#/variavel", "#/ajustes", "#/estatisticas[/AAAA-MM]", "#/categoria/<id|sem>/AAAA-MM[/estatisticas]". */
export const go = (hash: string) => {
  location.hash = hash;
};

/** Lançamentos de uma categoria (`id` null = sem categoria) no mês `ym`. */
export const goCategoria = (id: string | null, ym: string, from: 'inicio' | 'estatisticas' = 'inicio') =>
  go(`#/categoria/${id ?? 'sem'}/${ym}${from === 'estatisticas' ? '/estatisticas' : ''}`);
