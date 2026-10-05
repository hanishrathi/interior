/**
 * Writes design-system/styles/tokens.css from the token JSON files.
 *
 *   npm run tokens:css            # regenerate
 *   npm run tokens:check          # fail if the committed file is stale (CI)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { buildTokenCss } from '../design-system/tokens';
import { ROOT } from './lib/reporter';

export const TOKEN_CSS_PATH = resolve(ROOT, 'design-system/styles/tokens.css');

export function isTokenCssCurrent(): boolean {
  return existsSync(TOKEN_CSS_PATH) && readFileSync(TOKEN_CSS_PATH, 'utf8') === buildTokenCss();
}

function main(): number {
  const target = relative(ROOT, TOKEN_CSS_PATH);
  if (process.argv.includes('--check')) {
    if (isTokenCssCurrent()) {
      console.log(`${target} is up to date.`);
      return 0;
    }
    console.error(`${target} is out of date. Run "npm run tokens:css" and commit the result.`);
    return 1;
  }
  const css = buildTokenCss();
  writeFileSync(TOKEN_CSS_PATH, css);
  const count = css.split('\n').filter((line) => line.trimStart().startsWith('--')).length;
  console.log(`Wrote ${target} (${count} custom properties).`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(ROOT, 'scripts/generate-token-css.ts')) {
  process.exitCode = main();
}
