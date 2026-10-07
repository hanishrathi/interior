import { defineConfig } from 'vite';

// Builds the static preview site (site/) into site-dist/. Relative asset paths (`base: './'`) let the
// files be uploaded to any folder — a cPanel public_html root or a subdirectory — without changes.
export default defineConfig({
  root: 'site',
  base: './',
  build: { outDir: '../site-dist', emptyOutDir: true, sourcemap: false },
});
