import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Content Security Policy no build: só scripts do próprio site e conexões só com o
 * Supabase do projeto. Reduz o estrago de um XSS (a sessão fica no localStorage).
 * O GitHub Pages não permite cabeçalhos, por isso vai como <meta>.
 */
function csp(supabaseUrl: string): Plugin {
  const origin = new URL(supabaseUrl).origin;
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'", // estilos inline do React (largura das barras)
    "img-src 'self' data:",
    `connect-src 'self' ${origin}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head' },
    ],
  };
}

// No GitHub Pages o app fica em https://pznoni.github.io/simplebalance/
export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  if (command === 'build' && !env.VITE_SUPABASE_URL) throw new Error('VITE_SUPABASE_URL não definida.');

  return {
    base: command === 'build' || isPreview ? '/simplebalance/' : '/',
    build: { sourcemap: false },
    plugins: [
      react(),
      ...(command === 'build' ? [csp(env.VITE_SUPABASE_URL!)] : []),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icon-180.png'],
        manifest: {
          name: 'Simple Balance',
          short_name: 'Balance',
          lang: 'pt-BR',
          start_url: './',
          scope: './',
          display: 'standalone',
          background_color: '#f5f5f7',
          theme_color: '#f5f5f7',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
  };
});
