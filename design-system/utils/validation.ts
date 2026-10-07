import { z } from 'zod';
import type { Client } from '../schemas/client';
import { collectClaims } from '../schemas/common';
import { materialSchema, type Material } from '../schemas/material';
import { productSchema, type Product } from '../schemas/product';
import type { Project } from '../schemas/project';
import type { Room } from '../schemas/room';

export type ValidationLevel = 'error' | 'warning';

export interface ValidationIssue {
  path: string;
  message: string;
  level: ValidationLevel;
}

export interface ValidationResult<T> {
  ok: boolean;
  data: T | undefined;
  issues: ValidationIssue[];
}

/** `['products', 2, 'modelNumber']` → `products[2].modelNumber`. */
export function formatIssuePath(path: readonly PropertyKey[]): string {
  const text = path.reduce<string>((acc, key) => {
    if (typeof key === 'number') return `${acc}[${key}]`;
    return acc ? `${acc}.${String(key)}` : String(key);
  }, '');
  return text || '(root)';
}

const joinPath = (base: string, path: string): string => {
  if (!base) return path;
  if (path === '(root)') return base;
  return path.startsWith('[') ? `${base}${path}` : `${base}.${path}`;
};

const error = (path: string, message: string): ValidationIssue => ({ path, message, level: 'error' });

/** Parses `input` with `schema` and returns readable, path-addressed issues instead of throwing. */
export function validateWith<S extends z.ZodType>(schema: S, input: unknown, basePath = ''): ValidationResult<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data, issues: [] };
  return {
    ok: false,
    data: undefined,
    issues: result.error.issues.map((issue) => error(joinPath(basePath, formatIssuePath(issue.path)), issue.message)),
  };
}

const finalise = <T>(data: T, issues: ValidationIssue[]): ValidationResult<T> => ({
  ok: !issues.some((issue) => issue.level === 'error'),
  data,
  issues,
});

function duplicateIssues<T>(items: readonly T[], key: (item: T) => string | null, label: string, basePath: string): ValidationIssue[] {
  const seen = new Map<string, number>();
  const issues: ValidationIssue[] = [];
  items.forEach((item, index) => {
    const value = key(item);
    if (value === null) return;
    const first = seen.get(value);
    if (first === undefined) seen.set(value, index);
    else issues.push(error(`${basePath}[${index}]`, `Duplicate ${label} "${value}" (first used at ${basePath}[${first}]).`));
  });
  return issues;
}

export function validateProductCatalogue(input: unknown, basePath = 'products'): ValidationResult<Product[]> {
  const base = validateWith(z.array(productSchema), input, basePath);
  if (!base.data) return base;
  const products = base.data;
  const issues = [
    ...duplicateIssues(products, (p) => p.id, 'product id', basePath),
    ...duplicateIssues(products, (p) => p.modelNumber.value, 'model number', basePath).map((issue) => ({
      ...issue,
      level: 'warning' as const,
      message: `${issue.message} Check this is intentional (e.g. the same model in two rooms should be one record).`,
    })),
  ];
  return finalise(products, issues);
}

export function validateMaterialLibrary(input: unknown, basePath = 'materials'): ValidationResult<Material[]> {
  const base = validateWith(z.array(materialSchema), input, basePath);
  if (!base.data) return base;
  const materials = base.data;
  return finalise(materials, [
    ...duplicateIssues(materials, (m) => m.id, 'material id', basePath),
    ...duplicateIssues(materials, (m) => m.code, 'material code', basePath),
  ]);
}

// ---------------------------------------------------------------------------
// Cross-record integrity
// ---------------------------------------------------------------------------

export interface ProjectRecords {
  client?: Client;
  project: Project;
  rooms: readonly Room[];
  products: readonly Product[];
  materials: readonly Material[];
}

/** Checks that every id referenced across records exists. */
export function checkReferentialIntegrity(records: ProjectRecords): ValidationIssue[] {
  const { client, project, rooms, products, materials } = records;
  const issues: ValidationIssue[] = [];
  const productIds = new Set(products.map((p) => p.id));
  const materialIds = new Set(materials.map((m) => m.id));
  const projectRoomIds = new Set(project.rooms.map((r) => r.id));

  if (client && project.clientId !== client.id) {
    issues.push(error('project.clientId', `References client "${project.clientId}" but the client record is "${client.id}".`));
  }

  rooms.forEach((room, r) => {
    const base = `rooms[${r}]`;
    if (room.projectId !== project.id) issues.push(error(`${base}.projectId`, `Room belongs to "${room.projectId}", not "${project.id}".`));
    if (!projectRoomIds.has(room.id)) issues.push(error(`${base}.id`, `Room "${room.id}" is not listed in project.rooms.`));
    room.productIds.forEach((id, i) => {
      if (!productIds.has(id)) issues.push(error(`${base}.productIds[${i}]`, `Unknown product "${id}".`));
    });
    room.materialIds.forEach((id, i) => {
      if (!materialIds.has(id)) issues.push(error(`${base}.materialIds[${i}]`, `Unknown material "${id}".`));
    });
    room.fixtureAllowances.forEach((allowance, i) => {
      if (allowance.productId && !room.productIds.includes(allowance.productId)) {
        issues.push(error(`${base}.fixtureAllowances[${i}].productId`, `Product "${allowance.productId}" is not assigned to this room.`));
      }
    });
    const addressable = new Set([...productIds, ...materialIds, ...room.recommendations.map((rec) => rec.id)]);
    room.requirements.forEach((requirement, i) => {
      requirement.addressedBy.forEach((id, j) => {
        if (!addressable.has(id)) {
          issues.push(error(`${base}.requirements[${i}].addressedBy[${j}]`, `Unknown product, material or recommendation "${id}".`));
        }
      });
    });
    room.lighting?.fixtures.forEach((fixture, i) => {
      if (fixture.productId && !productIds.has(fixture.productId)) {
        issues.push(error(`${base}.lighting.fixtures[${i}].productId`, `Unknown product "${fixture.productId}".`));
      }
    });
  });

  const knownRoomIds = new Set([...projectRoomIds]);
  products.forEach((product, p) => {
    product.roomIds.forEach((id, i) => {
      if (!knownRoomIds.has(id)) issues.push(error(`products[${p}].roomIds[${i}]`, `Unknown room "${id}".`));
    });
  });
  materials.forEach((material, m) => {
    material.roomIds.forEach((id, i) => {
      if (!knownRoomIds.has(id)) issues.push(error(`materials[${m}].roomIds[${i}]`, `Unknown room "${id}".`));
    });
  });

  project.designBrief?.palette.materialIds.forEach((id, i) => {
    if (!materialIds.has(id)) issues.push(error(`project.designBrief.palette.materialIds[${i}]`, `Unknown material "${id}".`));
  });

  project.approvals.forEach((approval, a) => {
    const pool = approval.subject.kind === 'product' ? productIds : approval.subject.kind === 'material' ? materialIds : null;
    approval.subject.refIds.forEach((id, i) => {
      if (pool && !pool.has(id)) issues.push(error(`project.approvals[${a}].subject.refIds[${i}]`, `Unknown ${approval.subject.kind} "${id}".`));
    });
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Sample-data policy
// ---------------------------------------------------------------------------

export interface SampleDataPolicy {
  /** Brands that may appear in sample data. Everything named must still be marked as sample. */
  allowedBrands: readonly string[];
}

export const DEFAULT_SAMPLE_DATA_POLICY: SampleDataPolicy = { allowedBrands: ['Kohler'] };

/**
 * Rules for demonstration datasets: every record is explicitly sample data, nothing is verified,
 * nothing is confirmed, and only the allowed brands are named.
 */
export function checkSampleDataPolicy(
  items: readonly (Product | Material)[],
  policy: SampleDataPolicy = DEFAULT_SAMPLE_DATA_POLICY,
  basePath = 'items',
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allowed = policy.allowedBrands.map((brand) => brand.toLowerCase());
  items.forEach((item, index) => {
    const base = `${basePath}[${index}]`;
    if (!item.source.isSample) issues.push(error(`${base}.source.isSample`, 'Sample datasets may only contain records marked as sample data.'));
    if (item.verification.state !== 'sample-data') {
      issues.push(error(`${base}.verification.state`, 'Sample records must have the verification state "sample-data".'));
    }
    for (const { path, certainty } of collectClaims(item)) {
      if (certainty === 'confirmed') issues.push(error(`${base}.${path}`, 'Sample records cannot contain confirmed information.'));
    }
    if ('brand' in item) {
      const brand = item.brand.value;
      if (brand !== null && !allowed.includes(brand.toLowerCase())) {
        issues.push(error(`${base}.brand`, `Sample data may only name: ${policy.allowedBrands.join(', ')}.`));
      }
      if (brand !== null && item.modelNumber.value !== null) {
        issues.push(error(`${base}.modelNumber`, 'Sample data cannot name a model number — leave it null.'));
      }
    }
  });
  return issues;
}

// ---------------------------------------------------------------------------
// Text scanning: metric units and construction-readiness language
// ---------------------------------------------------------------------------

export interface TextField {
  path: string;
  text: string;
}

export interface TextFinding extends TextField {
  match: string;
}

/** Keys whose string values are identifiers, not prose. */
const NON_PROSE_KEYS = new Set(['id', 'url', 'code', 'projectId', 'roomId', 'productId', 'clientId', 'finishTokenId', 'referenceId']);

export function collectTextFields(input: unknown, basePath = ''): TextField[] {
  const fields: TextField[] = [];
  const visit = (node: unknown, path: string, key: string | null): void => {
    if (typeof node === 'string') {
      if (!key || !NON_PROSE_KEYS.has(key)) fields.push({ path, text: node });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`, key));
      return;
    }
    if (typeof node === 'object' && node !== null) {
      for (const [childKey, child] of Object.entries(node)) {
        if (childKey.endsWith('Ids')) continue;
        visit(child, path ? `${path}.${childKey}` : childKey, childKey);
      }
    }
  };
  visit(input, basePath, null);
  return fields;
}

/** A number, allowing digit grouping such as 1,200 or 1,20,000. */
const NUMBER = String.raw`\d(?:[\d,]*\d)?(?:\.\d+)?`;

/** Not part of a longer number (a `\b` fails after "x" in "12x10 ft"). */
const START = String.raw`(?<![\d.])`;
const FEET_MARK = `['′’]`;
const INCH_MARK = `["″”]`;

interface UnitPattern {
  pattern: RegExp;
  /** Rejects matches that only look like units, e.g. a number closing a quotation. */
  accept?: (text: string, index: number) => boolean;
}

/** True when a straight or curly quote before `index` is still open, so a following mark closes it. */
const insideQuotes = (text: string, index: number): boolean => {
  const before = text.slice(0, index);
  return (before.split('"').length - 1) % 2 === 1 || before.lastIndexOf('“') > before.lastIndexOf('”');
};

const IMPERIAL_PATTERNS: readonly UnitPattern[] = [
  // Areas and volumes: sq ft, sft, sq feet, sq yd, square feet, cft.
  {
    pattern: new RegExp(
      String.raw`${START}${NUMBER}\s*(?:sq\.?\s*(?:ft\.?|feet|foot|yd\.?|yards?)|sqft|sft|square\s+(?:feet|foot|yards?)|cft|cu\.?\s*ft\.?)(?![a-z])`,
      'gi',
    ),
  },
  // Feet and inches together: 5'6", 2’6”, 7′ 2″.
  { pattern: new RegExp(String.raw`${START}\d+\s*${FEET_MARK}\s*\d+(?:\.\d+)?\s*(?:${INCH_MARK}|in(?:ch(?:es)?)?\b)?`, 'gi') },
  // Lengths in words: 12 ft, 12x10 ft, 3 yards, 100 gaj.
  { pattern: new RegExp(String.raw`${START}${NUMBER}\s*(?:ft\.?|feet|foot|yards?|yd\.?|gaj)(?![a-z])`, 'gi') },
  { pattern: new RegExp(String.raw`${START}${NUMBER}\s*(?:inches|inch|in\.)(?![a-z])`, 'gi') },
  // A feet mark on its own: 6' wide, 10'x12'.
  { pattern: new RegExp(String.raw`${START}${NUMBER}\s*${FEET_MARK}(?![a-wyz\d])`, 'gi'), accept: (text, i) => !insideQuotes(text, i) },
  // An inch mark on its own: 36" vanity, 36” vanity — but not a number closing a quotation ("600").
  {
    pattern: new RegExp(String.raw`${START}${NUMBER}\s*${INCH_MARK}(?=\s|$|[,.;:)x×])`, 'g'),
    accept: (text, i) => !insideQuotes(text, i),
  },
];

function scanPatterns(text: string, patterns: readonly UnitPattern[]): string[] {
  let masked = text;
  const matches: string[] = [];
  for (const { pattern, accept } of patterns) {
    masked = masked.replace(pattern, (match: string, ...args: unknown[]) => {
      const index = args.find((arg) => typeof arg === 'number') as number;
      if (accept && !accept(masked, index)) return match;
      matches.push(match.trim());
      return ' '.repeat(match.length);
    });
  }
  return matches;
}

/** Imperial measurements in free text (ft, inches, sq ft, sft, yards, gaj, 5'6"…). Clawed Design is metric-only. */
export function findImperialUnits(text: string): string[] {
  return scanPatterns(text, IMPERIAL_PATTERNS);
}

const FOR_CONSTRUCTION = String.raw`for[- ]construction\b`;

const CONSTRUCTION_CLAIM_PATTERNS: readonly RegExp[] = [
  /\bconstruction[- ]ready\b/gi,
  new RegExp(String.raw`\b(?:issued?|issues|issuing|released|approved|good|ready|fit|drawings?|sets?|layouts?|plans?)[\s-]+${FOR_CONSTRUCTION}`, 'gi'),
  // A status label: "Bathroom layout — for construction", "Status: for construction".
  new RegExp(String.raw`(?:^|[—–:(]|\s-)\s*${FOR_CONSTRUCTION}`, 'gi'),
  /\bready\s+to\s+build\b/gi,
  /\bsite[- ]ready\b/gi,
  /\bfinal\s+(?:drawings?|specifications?|specs?|details?|designs?|layouts?|sets?|versions?|selections?|issue)\b/gi,
  /\bG\.?F\.?C\.?s?(?![a-z])/gi,
  // IFC alone is also the BIM file format, so only "IFC drawings", "IFC set"…
  /\bIFC\s+(?:drawings?|sets?|issue|revision|rev)\b/gi,
];

/** A negation directly before the claim: "not (yet) issued…", "before it is issued…". */
const NEGATION_BEFORE = new RegExp(
  String.raw`(?:\b(?:not|never|cannot|can't|isn't|aren't|wasn't|nor)\s+(?:(?:yet|be|been|being|is|are|was)\s+)*` +
    String.raw`|\b(?:before|until|prior\s+to)\s+(?:(?:it|they|this|these|the\s+\w+)\s+)?(?:(?:is|are|be|being|gets?|has\s+been|have\s+been)\s+)?)$`,
  'i',
);

/**
 * Phrases that present information as construction-ready ("issued for construction", "GFC",
 * "final drawings"…). Negated uses ("not for construction", "before it is issued for construction")
 * are ignored. Heuristic: a human reviews every finding.
 */
export function findConstructionReadyClaims(text: string): string[] {
  const claims: string[] = [];
  for (const pattern of CONSTRUCTION_CLAIM_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const claim = match[0].replace(/^[\s—–:(-]+/, '');
      const preceding = text.slice(0, (match.index ?? 0) + match[0].indexOf(claim));
      if (!NEGATION_BEFORE.test(preceding)) claims.push(claim);
    }
  }
  return [...new Set(claims)];
}

export function scanTextFields(fields: readonly TextField[], finder: (text: string) => string[]): TextFinding[] {
  return fields.flatMap((field) => finder(field.text).map((match) => ({ ...field, match })));
}
