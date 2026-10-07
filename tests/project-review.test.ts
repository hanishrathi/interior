import { describe, expect, it } from 'vitest';
import { reviewProject, type ProjectFiles } from '../design-system/utils/projectReview';
import { clone, raw } from './fixtures';

const files = (): ProjectFiles => ({
  project: clone(raw.project),
  client: clone(raw.client),
  rooms: clone(raw.bathroom),
  products: clone(raw.products),
  materials: clone(raw.materials),
});
const errors = (review: ReturnType<typeof reviewProject>) => review.issues.filter((issue) => issue.level === 'error');

describe('reviewProject', () => {
  it('reviews the sample project end to end without errors', () => {
    const review = reviewProject(files(), '2026-10-05');
    expect(errors(review)).toEqual([]);
    expect(Object.keys(review.compatibility)).toEqual([raw.bathroom.id]);
    expect(review.audit?.readiness.construction.ready).toBe(false);
  });

  it('accepts rooms as an array', () => {
    const review = reviewProject({ ...files(), rooms: [clone(raw.bathroom)] }, '2026-10-05');
    expect(errors(review)).toEqual([]);
  });

  it('reports schema errors and skips the audit instead of auditing invalid records', () => {
    const input = files();
    (input.project as { phase: string }).phase = 'demolition';
    const review = reviewProject(input, '2026-10-05');
    expect(errors(review).some((issue) => issue.path.startsWith('project.phase'))).toBe(true);
    expect(review.audit).toBeUndefined();
  });

  it('scans the client record for imperial units', () => {
    const input = files();
    (input.client as { openQuestions: { text: string }[] }).openQuestions[0]!.text = 'Is the living room about 12x14 ft?';
    expect(errors(reviewProject(input, '2026-10-05')).map((issue) => issue.message).join(' ')).toMatch(/14 ft/);
  });

  it('reports broken cross-references', () => {
    const input = files();
    (input.rooms as { productIds: string[] }).productIds.push('prd-missing');
    expect(errors(reviewProject(input, '2026-10-05')).map((issue) => issue.message).join(' ')).toMatch(/prd-missing/);
  });
});
