import { defineConfig } from 'vitest/config';

// One config drives both the library build (`vite build`) and the test runner (`vitest`).
export default defineConfig({
  // Stylesheets are shipped as-is next to the bundle (dist/tokens.css, dist/components.css).
  publicDir: 'design-system/styles',
  build: {
    outDir: 'dist',
    emptyOutDir: false, // dist/types is written by tsc before vite runs
    sourcemap: true,
    lib: {
      entry: 'design-system/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^zod($|\/)/],
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
