/**
 * Reviews a real project's records: schemas, cross-references, sample-data policy, metric units,
 * construction language, product compatibility per room, and the design audit with its readiness gates.
 *
 *   npm run review:project -- --project=path/project.json [--client=path] [--rooms=path] \
 *     [--products=path] [--materials=path] [--as-of=YYYY-MM-DD]
 *
 *   npm run review:project
 *       Reviews the bundled sample project (design-system/data).
 *
 * --rooms takes one room record or an array. Paths are relative to the repository root or absolute.
 * Exits with code 1 on any record error or critical audit finding. Unknown information is reported,
 * never filled in.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatDate, humanize } from '../design-system/utils/formatting';
import { reviewProject, type ProjectFiles } from '../design-system/utils/projectReview';
import { ROOT, Reporter } from './lib/reporter';

const DATA = 'design-system/data';
const SAMPLE: Record<keyof ProjectFiles, string> = {
  project: `${DATA}/sample-project.json`,
  client: `${DATA}/sample-client.json`,
  rooms: `${DATA}/sample-bathroom.json`,
  products: `${DATA}/sample-products.json`,
  materials: `${DATA}/sample-materials.json`,
};

const argValue = (name: string): string | undefined =>
  process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

/** Today in India, so an approval due today is not reported overdue (toISOString is UTC). */
const today = (): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

function load(path: string | undefined, report: Reporter): unknown {
  if (!path) return undefined;
  try {
    return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as unknown;
  } catch (error) {
    report.error(path, error instanceof Error ? error.message : 'Unreadable JSON');
    return undefined;
  }
}

function main(): number {
  const sampleMode = !argValue('project');
  const paths = sampleMode
    ? SAMPLE
    : { project: argValue('project'), client: argValue('client'), rooms: argValue('rooms'), products: argValue('products'), materials: argValue('materials') };
  const asOf = argValue('as-of') ?? today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    console.error(`--as-of must be a date such as 2026-10-07 (got "${asOf}").`);
    return 2;
  }

  const report = new Reporter(sampleMode ? 'Project review — sample project' : 'Project review');
  const files: ProjectFiles = {
    project: load(paths.project, report),
    client: load(paths.client, report),
    rooms: load(paths.rooms, report),
    products: load(paths.products, report),
    materials: load(paths.materials, report),
  };
  if (report.errorCount > 0) return report.finish();

  const review = reviewProject(files, asOf);
  report.add(review.issues);
  if (!review.issues.some((issue) => issue.level === 'error')) report.pass('Records are valid, consistent and metric');

  for (const [roomId, reports] of Object.entries(review.compatibility)) {
    console.log(`\nCompatibility — ${roomId}`);
    for (const [productId, result] of Object.entries(reports)) {
      console.log(`  ${productId.padEnd(22)} ${humanize(result.outcome).padEnd(17)} (${humanize(result.certainty).toLowerCase()})`);
      for (const check of result.checks.filter((c) => c.result === 'fail')) console.log(`      ✗ ${check.message}`);
    }
  }

  const audit = review.audit;
  if (audit) {
    console.log(`\nDesign audit — ${formatDate(asOf)} · score ${audit.score}/100`);
    for (const finding of audit.findings) {
      console.log(`  [${finding.severity}] ${finding.title}\n      → ${finding.recommendation}`);
      if (finding.severity === 'critical') report.error(`audit ${finding.ruleId}`, finding.title);
    }
    console.log('\nReadiness');
    const gates = [
      ['Client presentation', audit.readiness.clientPresentation],
      ['Coordination', audit.readiness.coordination],
      ['Construction', audit.readiness.construction],
    ] as const;
    for (const [label, { ready, blockers }] of gates) {
      console.log(`  ${label}: ${ready ? 'ready' : 'not ready'}`);
      for (const blocker of blockers) console.log(`      – ${blocker}`);
    }
  } else {
    report.warn('audit', 'Not run — fix the record errors first.');
  }

  return report.finish();
}

process.exitCode = main();
