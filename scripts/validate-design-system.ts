/**
 * Structural validation of the design system and its Claude Code layer.
 *
 *   npm run validate:design-system
 *
 * Checks tokens (resolution, contrast, generated CSS), stylesheet references, component
 * exports and hygiene, required documentation, and the frontmatter of skills and agents.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { ROOT, Reporter } from './lib/reporter';
import { isTokenCssCurrent } from './generate-token-css';

const report = new Reporter('Design system validation');
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');

export const REQUIRED_COMPONENTS = [
  'Button',
  'Card',
  'Badge',
  'Input',
  'Select',
  'Textarea',
  'Modal',
  'Tabs',
  'DataTable',
  'StatusBadge',
  'ProgressBar',
  'SectionHeader',
  'EmptyState',
  'ClientBriefCard',
  'RoomCard',
  'ProductCard',
  'MaterialCard',
  'ApprovalCard',
  'IssueCard',
  'ProductIntegrationTable',
  'RequirementsMatrix',
  'DesignBriefView',
  'DesignTokenPreview',
] as const;

export const REQUIRED_SKILLS = [
  'client-intake',
  'design-brief',
  'concept-development',
  'product-integration',
  'bathroom-design',
  'material-schedule',
  'technical-review',
  'client-presentation',
  'design-audit',
] as const;

export const REQUIRED_AGENTS = [
  'design-director',
  'space-planner',
  'product-coordinator',
  'materials-specialist',
  'bathroom-specialist',
  'lighting-specialist',
  'technical-reviewer',
  'client-presentation-writer',
] as const;

export const REQUIRED_DOCS = [
  'CLAUDE.md',
  'docs/architecture.md',
  'docs/design-principles.md',
  'docs/component-usage.md',
  'docs/token-usage.md',
  'docs/product-integration-workflow.md',
  'docs/assumptions.md',
] as const;

/** Minimal YAML frontmatter reader for `key: value` pairs. */
export function readFrontmatter(markdown: string): Record<string, string> | null {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  if (!match?.[1]) return null;
  const fields: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const pair = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (pair?.[1]) fields[pair[1]] = (pair[2] ?? '').trim();
  }
  return fields;
}

async function checkTokens(): Promise<void> {
  try {
    const tokens = await import('../design-system/tokens');
    report.pass(`${tokens.designTokens.length} tokens resolve without missing or circular references`);

    const failures = tokens.auditContrast().filter((result) => !result.passes);
    if (failures.length === 0) report.pass(`${tokens.CONTRAST_REQUIREMENTS.length} contrast pairs meet WCAG 2.2 AA`);
    for (const failure of failures) {
      report.error(
        'tokens/colors.json',
        `${failure.foreground} on ${failure.background} is ${failure.ratio.toFixed(2)}:1 (needs ${failure.minimum}:1) — ${failure.context}`,
      );
    }

    for (const reference of tokens.materialTokens.references) {
      for (const finishId of reference.commonFinishes) {
        const finish = tokens.finishTokens[finishId];
        if (!finish) report.error('tokens/materials.json', `${reference.id} lists unknown finish "${finishId}"`);
        else if (!finish.appliesTo.includes(reference.category)) {
          report.error('tokens/materials.json', `${reference.id}: finish "${finishId}" does not apply to ${reference.category}`);
        }
      }
    }
    const prefixes = Object.values(tokens.materialTokens.categories).map((category) => category.codePrefix);
    if (new Set(prefixes).size !== prefixes.length) report.error('tokens/materials.json', 'Material code prefixes must be unique');
    else report.pass('Material categories, references and finishes are consistent');
  } catch (error) {
    report.error('design-system/tokens', error instanceof Error ? error.message : String(error));
  }
}

function checkStylesheets(): void {
  if (isTokenCssCurrent()) report.pass('styles/tokens.css matches the token files');
  else report.error('styles/tokens.css', 'Out of date — run "npm run tokens:css"');

  const tokensCss = existsSync(resolve(ROOT, 'design-system/styles/tokens.css')) ? read('design-system/styles/tokens.css') : '';
  const componentsCss = read('design-system/styles/components.css');
  const defined = new Set([...`${tokensCss}\n${componentsCss}`.matchAll(/(--cd-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set([...componentsCss.matchAll(/var\((--cd-[a-z0-9-]+)/g)].map((m) => m[1]));
  const undefinedVars = [...used].filter((name) => !defined.has(name));
  if (undefinedVars.length === 0) report.pass(`components.css references ${used.size} defined custom properties`);
  for (const name of undefinedVars) report.error('styles/components.css', `Undefined custom property ${name}`);

  const rawColours = componentsCss.match(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/gi) ?? [];
  if (rawColours.length === 0) report.pass('components.css uses colour tokens only');
  else report.error('styles/components.css', `Raw colour values found: ${[...new Set(rawColours)].join(', ')}`);
}

function checkComponents(): void {
  const dir = resolve(ROOT, 'design-system/components');
  const files = readdirSync(dir).filter((file) => file.endsWith('.tsx'));
  const index = read('design-system/index.ts');

  const missing = REQUIRED_COMPONENTS.filter((name) => !files.includes(`${name}.tsx`));
  if (missing.length === 0) report.pass(`All ${REQUIRED_COMPONENTS.length} required components exist`);
  for (const name of missing) report.error('design-system/components', `Missing ${name}.tsx`);

  for (const file of files) {
    const name = basename(file, '.tsx');
    const source = readFileSync(join(dir, file), 'utf8');
    if (!index.includes(`'./components/${name}'`)) report.error('design-system/index.ts', `${name} is not exported`);
    if (/from 'zod'/.test(source)) report.error(`components/${file}`, 'Components must not import zod — validate in utils, render in components');
    if (/#[0-9a-fA-F]{6}\b/.test(source)) report.error(`components/${file}`, 'Hard-coded hex colour — use a token');
    if (!new RegExp(`export function ${name}\\b`).test(source)) report.warn(`components/${file}`, `Expected "export function ${name}"`);
  }
  report.pass(`${files.length} component files checked for exports and hygiene`);
}

function checkDocs(): void {
  const missing = REQUIRED_DOCS.filter((path) => !existsSync(resolve(ROOT, path)));
  if (missing.length === 0) report.pass(`All ${REQUIRED_DOCS.length} required documents exist`);
  for (const path of missing) report.error(path, 'Missing');
}

function checkClaudeLayer(): void {
  const settingsPath = resolve(ROOT, '.claude/settings.json');
  try {
    JSON.parse(readFileSync(settingsPath, 'utf8'));
    report.pass('.claude/settings.json is valid JSON');
  } catch (error) {
    report.error('.claude/settings.json', error instanceof Error ? error.message : 'Unreadable');
  }

  let skillsOk = true;
  for (const skill of REQUIRED_SKILLS) {
    const path = `.claude/skills/${skill}/SKILL.md`;
    if (!existsSync(resolve(ROOT, path))) {
      report.error(path, 'Missing');
      skillsOk = false;
      continue;
    }
    const meta = readFrontmatter(read(path));
    if (!meta) report.error(path, 'Missing YAML frontmatter');
    else {
      if (meta.name !== skill) report.error(path, `Frontmatter name "${meta.name ?? ''}" must be "${skill}"`);
      if (!meta.description || meta.description.length < 40) report.error(path, 'Frontmatter description must explain when to use the skill');
    }
    skillsOk &&= Boolean(meta && meta.name === skill && meta.description && meta.description.length >= 40);
  }
  if (skillsOk) report.pass(`${REQUIRED_SKILLS.length} skills have valid frontmatter`);

  let agentsOk = true;
  for (const agent of REQUIRED_AGENTS) {
    const path = `.claude/agents/${agent}.md`;
    if (!existsSync(resolve(ROOT, path))) {
      report.error(path, 'Missing');
      agentsOk = false;
      continue;
    }
    const meta = readFrontmatter(read(path));
    const valid = Boolean(meta && meta.name === agent && meta.description && meta.description.length >= 40);
    if (!valid) report.error(path, 'Frontmatter must include name (matching the file) and a description');
    agentsOk &&= valid;
  }
  if (agentsOk) report.pass(`${REQUIRED_AGENTS.length} agents have valid frontmatter`);
}

async function main(): Promise<number> {
  await checkTokens();
  checkStylesheets();
  checkComponents();
  checkDocs();
  checkClaudeLayer();
  return report.finish();
}

process.exitCode = await main();
