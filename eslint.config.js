import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist', 'coverage', 'node_modules']),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.js'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  {
    files: ['design-system/components/**/*.tsx'],
    extends: [reactHooks.configs.flat['recommended-latest'], jsxA11y.flatConfigs.recommended],
    rules: {
      // Scrollable table regions must be keyboard-focusable (WCAG 2.1.1, axe "scrollable-region-focusable").
      'jsx-a11y/no-noninteractive-tabindex': ['error', { tags: [], roles: ['tabpanel', 'region'] }],
    },
  },
  {
    // Test harnesses are components too.
    files: ['tests/**/*.tsx'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
