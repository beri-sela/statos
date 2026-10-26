import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

/**
 * For the offline build: put the icon inside the page as a data URI and drop links that
 * only make sense on a web server (other icon files, the web app manifest).
 */
function offlineHead(): Plugin {
  const svg = readFileSync(new URL('./public/favicon.svg', import.meta.url), 'utf-8');
  const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return {
    name: 'statos-offline-head',
    transformIndexHtml: html => html
      .replace(/\s*<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*>/g, '')
      .replace('</title>', `</title>\n    <link rel="icon" href="${dataUri}" type="image/svg+xml" />`),
  };
}

export default defineConfig(({ mode }) => {
  const offline = mode === 'offline';
  return {
    plugins: [react(), ...(offline ? [offlineHead(), viteSingleFile()] : [])],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    // The offline build is one self-contained HTML file that works when opened straight from disk.
    ...(offline ? { base: './', publicDir: false, build: { outDir: 'release/statos', emptyOutDir: true } } : {}),
    test: {
      globals: true,
      environment: 'jsdom',
    },
  } as never;
});
