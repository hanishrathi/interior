import { z } from 'zod';
import { MATERIAL_CATEGORIES, finishTokens, getMaterialReference, materialTokens } from '../tokens';
import {
  COMMITTED_ITEM_STATUSES,
  ITEM_STATUSES,
  SAMPLE_ALLOWED_STATUSES,
  collectSpecValues,
  currencySchema,
  idSchema,
  sourceSchema,
  specValue,
  statementSchema,
  textSchema,
  verificationSchema,
} from './common';

export const MATERIAL_APPLICATIONS = [
  'floor',
  'wall',
  'wet-area-floor',
  'wet-area-wall',
  'shower-floor',
  'countertop',
  'vanity-top',
  'joinery',
  'ceiling',
  'upholstery',
  'window-treatment',
  'exterior',
] as const;
export type MaterialApplication = (typeof MATERIAL_APPLICATIONS)[number];

/** Applications where slip resistance is a safety matter. */
export const WET_FLOOR_APPLICATIONS: readonly MaterialApplication[] = ['wet-area-floor', 'shower-floor'];

export const SAMPLE_STATUSES = ['not-requested', 'requested', 'received', 'approved', 'rejected'] as const;
export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export const COST_UNITS = ['m2', 'running-metre', 'piece', 'litre', 'sheet', 'kg'] as const;

export const materialSchema = z
  .object({
    id: idSchema,
    /** Schedule code: category prefix + two digits, e.g. `ST-01`. */
    code: z.string().regex(/^[A-Z]{2}-\d{2}$/, 'Use a schedule code such as "ST-01".'),
    name: textSchema,
    category: z.enum(MATERIAL_CATEGORIES),
    /** Link to a reference material in design-system/tokens/materials.json. */
    referenceId: textSchema.optional(),
    description: textSchema.optional(),
    origin: specValue(textSchema),
    supplier: specValue(textSchema),
    finish: specValue(textSchema.refine((id) => id in finishTokens, 'Unknown finish id (see tokens/finishes.json).')),
    colour: specValue(textSchema),
    /** Approximate on-screen swatch. Never a colour match — approve physical samples. */
    displayColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    format: z.object({
      lengthMm: specValue(z.number().positive()),
      widthMm: specValue(z.number().positive()),
      thicknessMm: specValue(z.number().positive()),
    }),
    applications: z.array(z.enum(MATERIAL_APPLICATIONS)).min(1),
    properties: z.object({
      /** e.g. a ramp rating ("R11") or pendulum value ("PTV 36+") from the supplier's test report. */
      slipResistance: specValue(textSchema),
      waterAbsorption: specValue(textSchema),
      requiresSealing: specValue(z.boolean()),
      maintenance: z.array(statementSchema),
    }),
    sampleStatus: z.enum(SAMPLE_STATUSES),
    status: z.enum(ITEM_STATUSES),
    verification: verificationSchema,
    source: sourceSchema,
    roomIds: z.array(idSchema),
    cost: z
      .object({
        currency: currencySchema,
        amount: specValue(z.number().nonnegative()),
        unit: z.enum(COST_UNITS),
        includesGst: specValue(z.boolean()),
      })
      .optional(),
    leadTimeWeeks: specValue(z.number().nonnegative()).optional(),
  })
  .superRefine((material, ctx) => {
    const expectedPrefix = materialTokens.categories[material.category].codePrefix;
    if (!material.code.startsWith(`${expectedPrefix}-`)) {
      ctx.addIssue({
        code: 'custom',
        path: ['code'],
        message: `Codes for ${material.category} must start with "${expectedPrefix}-".`,
      });
    }

    if (material.referenceId) {
      const reference = getMaterialReference(material.referenceId);
      if (!reference) {
        ctx.addIssue({ code: 'custom', path: ['referenceId'], message: 'Unknown reference material id.' });
      } else if (reference.category !== material.category) {
        ctx.addIssue({
          code: 'custom',
          path: ['category'],
          message: `Reference "${reference.id}" is ${reference.category}, not ${material.category}.`,
        });
      }
    }

    const finishId = material.finish.value;
    const finish = finishId ? finishTokens[finishId] : undefined;
    if (finish && !finish.appliesTo.includes(material.category)) {
      ctx.addIssue({
        code: 'custom',
        path: ['finish', 'value'],
        message: `Finish "${finishId}" does not apply to ${material.category}.`,
      });
    }

    if (COMMITTED_ITEM_STATUSES.includes(material.status) && material.verification.state !== 'verified') {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: `A material cannot be "${material.status}" until its verification state is "verified".`,
      });
    }
    if (material.status === 'client-approved' && material.sampleStatus !== 'approved') {
      ctx.addIssue({
        code: 'custom',
        path: ['sampleStatus'],
        message: 'A material should not be client-approved before its physical sample is approved.',
      });
    }

    if (material.source.isSample) {
      if (!SAMPLE_ALLOWED_STATUSES.includes(material.status)) {
        ctx.addIssue({
          code: 'custom',
          path: ['status'],
          message: `Sample data cannot progress beyond ${SAMPLE_ALLOWED_STATUSES.join(' / ')}.`,
        });
      }
      for (const { path, spec } of collectSpecValues(material)) {
        if (spec.certainty === 'confirmed') {
          ctx.addIssue({
            code: 'custom',
            path: path.split('.'),
            message: 'Sample data cannot confirm material information.',
          });
        }
      }
    }
  });
export type Material = z.infer<typeof materialSchema>;
