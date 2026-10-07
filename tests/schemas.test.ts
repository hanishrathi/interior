import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { approvalSchema } from '../design-system/schemas/approval';
import { specValue, statementSchema } from '../design-system/schemas/common';
import { issueSchema } from '../design-system/schemas/issue';
import { materialSchema } from '../design-system/schemas/material';
import { productSchema } from '../design-system/schemas/product';
import { designBriefSchema, projectSchema } from '../design-system/schemas/project';
import { roomSchema } from '../design-system/schemas/room';
import { checkSampleDataPolicy, formatIssuePath, validateWith } from '../design-system/utils/validation';
import { clientSchema } from '../design-system/schemas/client';
import { clone, confirmed, makeProduct, raw, sample } from './fixtures';

const messages = (result: z.ZodSafeParseResult<unknown>) => (result.success ? [] : result.error.issues.map((issue) => issue.message));

describe('sample data', () => {
  it('parses against every schema', () => {
    expect(sample.client.id).toBe('cli-mehta');
    expect(sample.project.phase).toBe('concept');
    expect(sample.bathroom.type).toBe('bathroom');
    expect(sample.products).toHaveLength(12);
    expect(sample.materials).toHaveLength(8);
  });

  it('marks every Kohler product as unverified sample data with no model number', () => {
    const kohler = sample.products.filter((product) => product.brand.value === 'Kohler');
    expect(kohler.length).toBeGreaterThan(0);
    for (const product of kohler) {
      expect(product.source.isSample).toBe(true);
      expect(product.verification.state).toBe('sample-data');
      expect(product.modelNumber.value).toBeNull();
      expect(product.source.note).toMatch(/verified/i);
    }
  });
});

describe('specValue', () => {
  const schema = specValue(z.number());

  it('accepts confirmed values with a source', () => {
    expect(schema.safeParse({ value: 900, certainty: 'confirmed', source: 'Site survey' }).success).toBe(true);
  });

  it('rejects confirmed values without a source', () => {
    expect(messages(schema.safeParse({ value: 900, certainty: 'confirmed' }))).toContain('Confirmed values must cite a source.');
  });

  it('rejects a value marked unknown', () => {
    expect(schema.safeParse({ value: 900, certainty: 'unknown' }).success).toBe(false);
  });

  it('rejects an empty value marked assumed or confirmed', () => {
    expect(schema.safeParse({ value: null, certainty: 'assumed', note: 'guess' }).success).toBe(false);
    expect(schema.safeParse({ value: null, certainty: 'confirmed', source: 'x' }).success).toBe(false);
  });

  it('requires a note for assumptions', () => {
    expect(schema.safeParse({ value: 900, certainty: 'assumed' }).success).toBe(false);
    expect(schema.safeParse({ value: 900, certainty: 'assumed', note: 'Typical allowance' }).success).toBe(true);
  });

  it('requires the value key itself — omission is not the same as unknown', () => {
    expect(schema.safeParse({ certainty: 'unknown' }).success).toBe(false);
  });
});

describe('statements', () => {
  it('requires an owner for items awaiting approval', () => {
    expect(statementSchema.safeParse({ id: 's-1', text: 'Widen the door.', certainty: 'requires-approval' }).success).toBe(false);
    expect(
      statementSchema.safeParse({ id: 's-1', text: 'Widen the door.', certainty: 'requires-approval', owner: 'Client' }).success,
    ).toBe(true);
  });
});

describe('product rules', () => {
  it('accepts a verified product with confirmed essentials', () => {
    expect(makeProduct().verification.state).toBe('verified');
  });

  it('blocks ordering an unverified product', () => {
    const product = { ...clone(raw.products[0]), source: { kind: 'dealer-quotation', reference: 'Q-1', isSample: false } };
    expect(messages(productSchema.safeParse({ ...product, status: 'ordered', verification: { state: 'unverified' } }))).toContain(
      'A product cannot be "ordered" until its verification state is "verified".',
    );
  });

  it('blocks sample data from progressing beyond shortlisting', () => {
    const result = productSchema.safeParse({ ...clone(raw.products[0]), status: 'selected' });
    expect(result.success).toBe(false);
  });

  it('blocks confirmed claims inside sample data', () => {
    const product = clone(raw.products[0]);
    const result = productSchema.safeParse({ ...product, modelNumber: { value: 'K-0000', certainty: 'confirmed', source: 'Memory' } });
    expect(messages(result)).toContain('Sample data cannot confirm product information. Use "requires-verification" or "unknown".');
  });

  it('requires confirmed model number and dimensions before a product is verified', () => {
    const product = makeProduct();
    const result = productSchema.safeParse({ ...product, modelNumber: { value: null, certainty: 'unknown' } });
    expect(messages(result)).toContain('A verified product must have a confirmed brand, model number and dimensions.');
  });

  it('rejects malformed IP codes', () => {
    const product = makeProduct();
    const result = productSchema.safeParse({
      ...product,
      installation: { ...product.installation, ipRating: confirmed('IP4') },
    });
    expect(result.success).toBe(false);
  });

  it('reports readable paths', () => {
    const result = validateWith(productSchema, { ...clone(raw.products[0]), category: 'sofa' }, 'products[0]');
    expect(result.ok).toBe(false);
    expect(result.issues[0]?.path).toBe('products[0].category');
    expect(formatIssuePath(['rooms', 2, 'dimensions'])).toBe('rooms[2].dimensions');
  });
});

describe('material rules', () => {
  it('enforces the category code prefix', () => {
    const result = materialSchema.safeParse({ ...clone(raw.materials[0]), code: 'TL-01' });
    expect(messages(result)).toContain('Codes for natural-stone must start with "ST-".');
  });

  it('rejects finishes that do not apply to the category', () => {
    const material = clone(raw.materials[0]);
    const result = materialSchema.safeParse({ ...material, finish: { value: 'paint-matt', certainty: 'requires-approval', source: 'x' } });
    expect(messages(result)).toContain('Finish "paint-matt" does not apply to natural-stone.');
  });

  it('rejects unknown finish ids', () => {
    const material = clone(raw.materials[0]);
    const result = materialSchema.safeParse({ ...material, finish: { value: 'mirror-gloss', certainty: 'requires-approval', source: 'x' } });
    expect(result.success).toBe(false);
  });
});

describe('project and brief rules', () => {
  it('never allows a concept-phase project to be issued for construction', () => {
    const result = projectSchema.safeParse({ ...clone(raw.project), documentStatus: 'for-construction' });
    expect(messages(result).join(' ')).toMatch(/Conceptual information is never construction-ready/);
  });

  it('never allows a design brief to be issued for construction', () => {
    const brief = clone(raw.project.designBrief);
    expect(designBriefSchema.safeParse({ ...brief, documentStatus: 'for-construction' }).success).toBe(false);
  });

  it('rejects confirmed statements listed as assumptions', () => {
    const brief = clone(raw.project.designBrief);
    brief.assumptions = [{ id: 'as-x', text: 'Fact.', certainty: 'confirmed', source: 'Survey' }];
    expect(designBriefSchema.safeParse(brief).success).toBe(false);
  });
});

describe('approvals, issues and rooms', () => {
  const approval = raw.project.approvals[1];

  it('requires evidence for a decided approval', () => {
    const result = approvalSchema.safeParse({ ...clone(approval), status: 'approved' });
    expect(messages(result)).toContain('A decision ("approved") must record decidedOn.');
  });

  it('requires a resolution for resolved issues', () => {
    const result = issueSchema.safeParse({ ...clone(raw.project.issues[0]), status: 'resolved' });
    expect(result.success).toBe(false);
  });

  it('requires bathroom details for wet rooms', () => {
    const room = clone(raw.bathroom) as Record<string, unknown>;
    delete room.bathroom;
    expect(roomSchema.safeParse(room).success).toBe(false);
  });

  it('keeps the false ceiling below the slab soffit', () => {
    const room = clone(raw.bathroom);
    room.dimensions.falseCeilingHeightMm.value = 2900;
    expect(roomSchema.safeParse(room).success).toBe(false);
  });
});

describe('evidence rules found in review', () => {
  const kohler = () => clone(raw.products[0]!);

  it('rejects confirmed statements, not just confirmed values, in sample data', () => {
    const product = kohler();
    product.installation.requiredComponents = [
      { id: 'rc-x', text: 'Requires a matching in-wall tank.', certainty: 'confirmed', source: 'Memory' },
    ] as unknown as typeof product.installation.requiredComponents;
    expect(messages(productSchema.safeParse(product))).toContain(
      'Sample data cannot confirm product information. Use "requires-verification" or "unknown".',
    );
    expect(checkSampleDataPolicy([productSchema.parse(kohler())])).toEqual([]);
  });

  it('treats a model number in sample data as an error, not a warning', () => {
    const product = productSchema.parse({ ...kohler(), modelNumber: { value: 'K-12345', certainty: 'requires-verification', source: 'x' } });
    expect(checkSampleDataPolicy([product]).map((issue) => issue.level)).toContain('error');
  });

  it('reserves the "sample-data" verification state for sample sources', () => {
    const product = { ...makeProduct(), verification: { state: 'sample-data' } };
    expect(productSchema.safeParse(product).success).toBe(false);
  });

  it('requires a confirmed brand and a cited document before a product is verified', () => {
    const product = makeProduct();
    expect(productSchema.safeParse({ ...product, brand: { value: null, certainty: 'unknown' } }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, source: { ...product.source, reference: null } }).success).toBe(false);
  });

  it('requires confirmed finish, quantity and installation before a product is ordered', () => {
    const product = makeProduct({ status: 'ordered' });
    const unknownDrainage = { ...product, installation: { ...product.installation, drainage: { value: null, certainty: 'unknown' } } };
    expect(messages(productSchema.safeParse(unknownDrainage)).join(' ')).toMatch(/finish, quantity and installation/);
  });

  it('blocks ordering a material whose sample was rejected, and verifying sample materials', () => {
    const material = clone(raw.materials[1]);
    const ordered = { ...material, status: 'ordered', sampleStatus: 'rejected', verification: { state: 'verified', verifiedBy: 'x', verifiedOn: '2026-09-01', method: 'physical-sample' } };
    expect(messages(materialSchema.safeParse(ordered)).join(' ')).toMatch(/before its physical sample is approved/);
    expect(messages(materialSchema.safeParse(ordered)).join(' ')).toMatch(/exactly when the source is sample data/);
  });

  it('rejects vocabulary keys inherited from Object.prototype instead of throwing', () => {
    const material = clone(raw.materials[0]!);
    for (const finish of ['__proto__', 'constructor', 'toString']) {
      expect(materialSchema.safeParse({ ...material, finish: { ...material.finish, value: finish } }).success).toBe(false);
    }
  });

  it('requires an explanation for values awaiting approval and assumed statements', () => {
    const schema = specValue(z.number());
    expect(schema.safeParse({ value: 900, certainty: 'requires-approval' }).success).toBe(false);
    expect(schema.safeParse({ value: 900, certainty: 'requires-approval', note: 'Proposed width' }).success).toBe(true);
    expect(statementSchema.safeParse({ id: 's-1', text: 'Typical.', certainty: 'assumed' }).success).toBe(false);
    expect(statementSchema.safeParse({ id: 's-1', text: 'Typical.', certainty: 'assumed', note: 'Common practice' }).success).toBe(true);
  });

  it('keeps critical issues owned while in progress and dates in order', () => {
    const issue = { ...clone(raw.project.issues[0]), severity: 'critical', owner: undefined };
    expect(issueSchema.safeParse({ ...issue, status: 'in-progress' }).success).toBe(false);
    expect(issueSchema.safeParse({ ...issue, owner: 'Designer', dueOn: '2000-01-01' }).success).toBe(false);
  });

  it('does not accept assumed open questions on the client record', () => {
    const client = clone(raw.client);
    client.openQuestions = [
      { id: 'oq-x', text: 'Budget includes GST?', certainty: 'assumed', note: 'Guess' },
    ] as unknown as typeof client.openQuestions;
    expect(clientSchema.safeParse(client).success).toBe(false);
  });
});
