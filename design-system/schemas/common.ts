import { z } from 'zod';

/**
 * Shared primitives. The central idea: information is never just a value — it carries
 * a certainty level and, where it is claimed as fact, a source.
 */

// ---------------------------------------------------------------------------
// Certainty
// ---------------------------------------------------------------------------

export const CERTAINTY_LEVELS = ['confirmed', 'assumed', 'unknown', 'requires-verification', 'requires-approval'] as const;
export const certaintySchema = z.enum(CERTAINTY_LEVELS);
/**
 * - `confirmed` — verified against a cited source (manufacturer document, site measurement, signed approval).
 * - `assumed` — a working assumption; the note must say what it rests on.
 * - `unknown` — not known; the value must be `null`.
 * - `requires-verification` — recorded but not yet checked against an authoritative source.
 * - `requires-approval` — proposed by the designer and awaiting the client's or a consultant's approval.
 */
export type Certainty = z.infer<typeof certaintySchema>;

// ---------------------------------------------------------------------------
// Primitive fields
// ---------------------------------------------------------------------------

export const idSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'Use lowercase kebab-case identifiers, e.g. "prd-wc-01".');

export const textSchema = z.string().trim().min(1, 'Must not be empty.');

/** Calendar date, `YYYY-MM-DD`. */
export const isoDateSchema = z.iso.date();

export const currencySchema = z.string().regex(/^[A-Z]{3}$/, 'Use an ISO 4217 currency code, e.g. "INR".');

/** Positive measurement in millimetres. All measurements in Clawed Design are metric. */
export const millimetresSchema = z.number().positive().max(100_000, 'Value looks too large for millimetres.');

// ---------------------------------------------------------------------------
// SpecValue — a value with provenance
// ---------------------------------------------------------------------------

const specValueRules = (
  // `value` is optional here only because Zod cannot see through the generic inner schema.
  spec: { value?: unknown; certainty: Certainty; source?: string | undefined; note?: string | undefined },
  ctx: z.RefinementCtx,
): void => {
  const empty = spec.value === null || spec.value === undefined;
  if (empty && spec.certainty !== 'unknown' && spec.certainty !== 'requires-verification') {
    ctx.addIssue({
      code: 'custom',
      path: ['certainty'],
      message: 'An empty value must be marked "unknown" or "requires-verification".',
    });
  }
  if (!empty && spec.certainty === 'unknown') {
    ctx.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'A value marked "unknown" must be null. Record a working value as "assumed" with a note instead.',
    });
  }
  if (spec.certainty === 'confirmed' && !spec.source) {
    ctx.addIssue({ code: 'custom', path: ['source'], message: 'Confirmed values must cite a source.' });
  }
  if (spec.certainty === 'assumed' && !spec.note) {
    ctx.addIssue({ code: 'custom', path: ['note'], message: 'Assumed values must explain the assumption in "note".' });
  }
  if (!empty && spec.certainty === 'requires-verification' && !spec.source && !spec.note) {
    ctx.addIssue({
      code: 'custom',
      path: ['note'],
      message: 'Unverified values must say where they came from ("source") or what must be checked ("note").',
    });
  }
};

/**
 * A value whose provenance matters. `value: null` means the information is not known and must be
 * marked `unknown` or `requires-verification` — never guessed.
 */
export function specValue<T extends z.ZodType>(inner: T) {
  return z
    .object({
      value: inner.nullable(),
      certainty: certaintySchema,
      source: textSchema.optional(),
      note: textSchema.optional(),
    })
    .superRefine(specValueRules);
}

export interface SpecValue<T> {
  value: T | null;
  certainty: Certainty;
  source?: string | undefined;
  note?: string | undefined;
}

/** Type guard used by walkers that look for spec values inside arbitrary records. */
export function isSpecValue(candidate: unknown): candidate is SpecValue<unknown> {
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'value' in candidate &&
    'certainty' in candidate &&
    CERTAINTY_LEVELS.includes((candidate as { certainty: Certainty }).certainty)
  );
}

export interface SpecValueEntry {
  path: string;
  spec: SpecValue<unknown>;
}

/** Depth-first list of every spec value inside a record, with dot/bracket paths. */
export function collectSpecValues(input: unknown, basePath = ''): SpecValueEntry[] {
  const entries: SpecValueEntry[] = [];
  const visit = (node: unknown, path: string): void => {
    if (isSpecValue(node)) {
      entries.push({ path, spec: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (typeof node === 'object' && node !== null) {
      for (const [key, child] of Object.entries(node)) visit(child, path ? `${path}.${key}` : key);
    }
  };
  visit(input, basePath);
  return entries;
}

export const dimensionsMmSchema = z.object({
  widthMm: specValue(millimetresSchema),
  depthMm: specValue(millimetresSchema),
  heightMm: specValue(millimetresSchema),
});
export type DimensionsMm = z.infer<typeof dimensionsMmSchema>;

// ---------------------------------------------------------------------------
// Statements and recommendations
// ---------------------------------------------------------------------------

const statementShape = {
  id: idSchema,
  text: textSchema,
  certainty: certaintySchema,
  /** Where the statement comes from: a meeting, document, measurement or person. */
  source: textSchema.optional(),
  /** Who must verify or approve it. */
  owner: textSchema.optional(),
};

const statementRules = (
  statement: { certainty: Certainty; source?: string | undefined; owner?: string | undefined },
  ctx: z.RefinementCtx,
): void => {
  if (statement.certainty === 'confirmed' && !statement.source) {
    ctx.addIssue({ code: 'custom', path: ['source'], message: 'Confirmed statements must cite a source.' });
  }
  if (statement.certainty === 'requires-approval' && !statement.owner) {
    ctx.addIssue({ code: 'custom', path: ['owner'], message: 'Say who must approve this ("owner").' });
  }
};

/** A sentence of design information with an explicit certainty level. */
export const statementSchema = z.object(statementShape).superRefine(statementRules);
export type Statement = z.infer<typeof statementSchema>;

/**
 * A major recommendation. Must carry a rationale and a certainty so readers can tell
 * confirmed facts from assumptions and from items still awaiting verification or approval.
 */
export const recommendationSchema = z
  .object({ ...statementShape, rationale: textSchema })
  .superRefine(statementRules);
export type Recommendation = z.infer<typeof recommendationSchema>;

// ---------------------------------------------------------------------------
// Sources and verification
// ---------------------------------------------------------------------------

export const SOURCE_KINDS = [
  'manufacturer-documentation',
  'manufacturer-website',
  'dealer-quotation',
  'supplier-sample',
  'site-measurement',
  'designer-specification',
  'client-provided',
  'sample-data',
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const sourceSchema = z
  .object({
    kind: z.enum(SOURCE_KINDS),
    /** Document title, quotation number or drawing reference. `null` when not yet available. */
    reference: textSchema.nullable(),
    url: z.url().optional(),
    retrievedOn: isoDateSchema.optional(),
    /** Explicit flag for demonstration data. Sample data never counts as a source of truth. */
    isSample: z.boolean(),
    note: textSchema.optional(),
  })
  .superRefine((source, ctx) => {
    if ((source.kind === 'sample-data') !== source.isSample) {
      ctx.addIssue({
        code: 'custom',
        path: ['isSample'],
        message: 'Use kind "sample-data" exactly when isSample is true.',
      });
    }
    if (source.isSample && !source.note) {
      ctx.addIssue({ code: 'custom', path: ['note'], message: 'Sample data must carry a disclaimer note.' });
    }
  });
export type Source = z.infer<typeof sourceSchema>;

export const VERIFICATION_STATES = ['verified', 'partially-verified', 'unverified', 'sample-data'] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const VERIFICATION_METHODS = [
  'manufacturer-documentation',
  'dealer-confirmation',
  'physical-sample',
  'site-check',
  'consultant-review',
] as const;

export const verificationSchema = z
  .object({
    state: z.enum(VERIFICATION_STATES),
    verifiedBy: textSchema.optional(),
    verifiedOn: isoDateSchema.optional(),
    method: z.enum(VERIFICATION_METHODS).optional(),
    notes: textSchema.optional(),
  })
  .superRefine((verification, ctx) => {
    if (verification.state === 'verified' || verification.state === 'partially-verified') {
      for (const field of ['verifiedBy', 'verifiedOn', 'method'] as const) {
        if (!verification[field]) {
          ctx.addIssue({ code: 'custom', path: [field], message: `Required when the state is "${verification.state}".` });
        }
      }
    }
  });
export type Verification = z.infer<typeof verificationSchema>;

// ---------------------------------------------------------------------------
// Item lifecycle (products and materials)
// ---------------------------------------------------------------------------

export const ITEM_STATUSES = [
  'proposed',
  'shortlisted',
  'selected',
  'client-approved',
  'ordered',
  'delivered',
  'installed',
  'rejected',
  'discontinued',
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/** Statuses that commit money or site work and therefore require verified information. */
export const COMMITTED_ITEM_STATUSES: readonly ItemStatus[] = ['ordered', 'delivered', 'installed'];

/** Statuses that sample data may hold. Sample data can be discussed, never procured. */
export const SAMPLE_ALLOWED_STATUSES: readonly ItemStatus[] = ['proposed', 'shortlisted', 'rejected'];

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export const budgetSchema = z.object({
  currency: currencySchema,
  range: specValue(
    z
      .object({ minimum: z.number().nonnegative(), maximum: z.number().nonnegative() })
      .refine((range) => range.minimum <= range.maximum, 'minimum must not exceed maximum'),
  ),
  /** Whether the range includes GST. Frequently unstated in early conversations — record it as unknown. */
  includesGst: specValue(z.boolean()),
  covers: textSchema.optional(),
});
export type Budget = z.infer<typeof budgetSchema>;

export const priceSchema = z.object({
  currency: currencySchema,
  amount: specValue(z.number().nonnegative()),
  includesGst: specValue(z.boolean()),
});
export type Price = z.infer<typeof priceSchema>;
