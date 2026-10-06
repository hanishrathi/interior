import { playwright } from '@vitest/browser-playwright';
import { configDefaults, defineConfig } from 'vitest/config';

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
    projects: [
      {
        // Logic, schemas, data and static markup — fast, no browser needed (`npm test`).
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/**/*.test.{ts,tsx}'],
          exclude: [...configDefaults.exclude, 'tests/browser/**'],
          environment: 'node',
        },
      },
      {
        // Interaction, focus and keyboard behaviour in a real Chromium (`npm run test:browser`).
        extends: true,
        // The stylesheets are imported by the test setup, not served as public files.
        publicDir: false,
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/browser/setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            // Playwright's own Chromium by default (`npx playwright install chromium`); set
            // CHROMIUM_EXECUTABLE_PATH to use a Chromium that is already installed instead.
            provider: playwright({
              launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined },
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
