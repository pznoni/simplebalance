// Aplica o tema antes da pintura (mesma chave de src/lib/theme.ts).
// Arquivo externo, e não inline, porque a CSP do build só permite script-src 'self'.
(function () {
  var t = null;
  try { t = localStorage.getItem('sb-theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', t === 'dark' ? '#000000' : '#f5f5f7');
})();
