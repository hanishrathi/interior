import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root, resolved from this file so scripts work from any working directory. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export type Level = 'error' | 'warning';

export interface Problem {
  level: Level;
  where: string;
  message: string;
}

/** Collects check results and prints a compact report. */
export class Reporter {
  private readonly problems: Problem[] = [];
  private readonly passed: string[] = [];

  constructor(private readonly title: string) {}

  pass(check: string): void {
    this.passed.push(check);
  }

  error(where: string, message: string): void {
    this.problems.push({ level: 'error', where, message });
  }

  warn(where: string, message: string): void {
    this.problems.push({ level: 'warning', where, message });
  }

  add(problems: readonly { level: Level; path: string; message: string }[], prefix = ''): void {
    for (const problem of problems) {
      this.problems.push({ level: problem.level, where: prefix ? `${prefix} ${problem.path}` : problem.path, message: problem.message });
    }
  }

  get errorCount(): number {
    return this.problems.filter((p) => p.level === 'error').length;
  }

  get warningCount(): number {
    return this.problems.filter((p) => p.level === 'warning').length;
  }

  /** Prints the report and returns the process exit code. */
  finish(): number {
    console.log(`\n${this.title}\n${'='.repeat(this.title.length)}`);
    for (const check of this.passed) console.log(`  ✓ ${check}`);
    for (const problem of this.problems) {
      console.log(`  ${problem.level === 'error' ? '✗' : '!'} ${problem.where}: ${problem.message}`);
    }
    console.log(`\n${this.passed.length} passed · ${this.errorCount} errors · ${this.warningCount} warnings\n`);
    return this.errorCount > 0 ? 1 : 0;
  }
}
