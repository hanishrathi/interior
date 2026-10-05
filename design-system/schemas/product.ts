import { z } from 'zod';
import { IP_RATING_PATTERN } from '../tokens';
import {
  COMMITTED_ITEM_STATUSES,
  ITEM_STATUSES,
  SAMPLE_ALLOWED_STATUSES,
  collectSpecValues,
  dimensionsMmSchema,
  idSchema,
  priceSchema,
  sourceSchema,
  specValue,
  statementSchema,
  textSchema,
  verificationSchema,
} from './common';

export const PRODUCT_CATEGORIES = [
  'wc',
  'concealed-cistern',
  'basin',
  'basin-mixer',
  'shower-mixer',
  'shower-head',
  'hand-shower',
  'health-faucet',
  'bathtub',
  'drain',
  'water-heater',
  'vanity',
  'mirror',
  'grab-bar',
  'accessory',
  'lighting',
  'switch-socket',
  'kitchen-sink',
  'kitchen-mixer',
  'appliance',
  'furniture',
  'hardware',
  'other',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const MOUNTING_TYPES = [
  'floor-standing',
  'wall-hung',
  'wall-mounted',
  'deck-mounted',
  'countertop',
  'undercounter',
  'recessed',
  'surface-mounted',
  'pendant',
  'concealed',
  'freestanding',
  'built-in',
] as const;
export type MountingType = (typeof MOUNTING_TYPES)[number];

export const WATER_SUPPLY_TYPES = ['none', 'cold', 'hot', 'hot-and-cold'] as const;
export type WaterSupplyType = (typeof WATER_SUPPLY_TYPES)[number];

/** `floor-outlet` ≈ S-trap WC connection; `wall-outlet` ≈ P-trap / wall-hung WC connection. */
export const DRAINAGE_TYPES = ['none', 'floor-outlet', 'wall-outlet', 'floor-trap', 'linear-drain', 'waste-outlet'] as const;
export type DrainageType = (typeof DRAINAGE_TYPES)[number];

export const ELECTRICAL_TYPES = ['none', 'socket-6a', 'socket-16a', 'hardwired', 'low-voltage-driver'] as const;
export type ElectricalType = (typeof ELECTRICAL_TYPES)[number];

export const ipRatingSchema = z.string().regex(IP_RATING_PATTERN, 'Use an IP code such as "IP44" or "IPX4".');

export const installationSchema = z.object({
  mounting: specValue(z.enum(MOUNTING_TYPES)),
  waterSupply: specValue(z.enum(WATER_SUPPLY_TYPES)),
  drainage: specValue(z.enum(DRAINAGE_TYPES)),
  electrical: specValue(z.enum(ELECTRICAL_TYPES)),
  /** Minimum working pressure from the manufacturer's data. */
  minWaterPressureBar: specValue(z.number().positive()).optional(),
  /** Finished wall to outlet centre ("rough-in"), for WCs. */
  outletSetOutMm: specValue(z.number().positive()).optional(),
  /** Number of tap holes, for basins and sinks. */
  tapHoles: specValue(z.number().int().min(0).max(3)).optional(),
  /** Ingress protection, for electrical items. */
  ipRating: specValue(ipRatingSchema).optional(),
  /** Components the installation depends on (e.g. a concealed cistern and frame). */
  requiredComponents: z.array(statementSchema),
  notes: z.array(statementSchema),
});
export type InstallationRequirements = z.infer<typeof installationSchema>;

export const productDocumentSchema = z.object({
  title: textSchema,
  kind: z.enum(['spec-sheet', 'installation-guide', 'warranty', 'quotation', 'image', 'other']),
  url: z.url().optional(),
  /** `false` until someone has opened the document and checked it applies to this exact model. */
  checked: z.boolean(),
});

export const productSchema = z
  .object({
    id: idSchema,
    name: textSchema,
    category: z.enum(PRODUCT_CATEGORIES),
    brand: specValue(textSchema),
    collection: specValue(textSchema).optional(),
    modelNumber: specValue(textSchema),
    description: textSchema.optional(),
    source: sourceSchema,
    dimensions: dimensionsMmSchema,
    finish: z.object({
      name: specValue(textSchema),
      code: specValue(textSchema),
      /** Optional link to the shared finish vocabulary (design-system/tokens/finishes.json). */
      finishTokenId: textSchema.optional(),
    }),
    installation: installationSchema,
    status: z.enum(ITEM_STATUSES),
    verification: verificationSchema,
    roomIds: z.array(idSchema),
    quantity: specValue(z.number().int().positive()),
    price: priceSchema.optional(),
    leadTimeWeeks: specValue(z.number().nonnegative()).optional(),
    documents: z.array(productDocumentSchema),
    tags: z.array(textSchema).optional(),
  })
  .superRefine((product, ctx) => {
    if (COMMITTED_ITEM_STATUSES.includes(product.status) && product.verification.state !== 'verified') {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: `A product cannot be "${product.status}" until its verification state is "verified".`,
      });
    }

    if (product.verification.state === 'verified') {
      const essentials = [
        ['modelNumber', product.modelNumber],
        ['dimensions.widthMm', product.dimensions.widthMm],
        ['dimensions.depthMm', product.dimensions.depthMm],
        ['dimensions.heightMm', product.dimensions.heightMm],
      ] as const;
      for (const [path, spec] of essentials) {
        if (spec.certainty !== 'confirmed') {
          ctx.addIssue({
            code: 'custom',
            path: path.split('.'),
            message: 'A verified product must have a confirmed model number and dimensions.',
          });
        }
      }
    }

    if (product.source.isSample) {
      if (!SAMPLE_ALLOWED_STATUSES.includes(product.status)) {
        ctx.addIssue({
          code: 'custom',
          path: ['status'],
          message: `Sample data cannot progress beyond ${SAMPLE_ALLOWED_STATUSES.join(' / ')}. Replace it with a verified source first.`,
        });
      }
      if (product.verification.state === 'verified' || product.verification.state === 'partially-verified') {
        ctx.addIssue({
          code: 'custom',
          path: ['verification', 'state'],
          message: 'Sample data cannot be marked as verified.',
        });
      }
      for (const { path, spec } of collectSpecValues(product)) {
        if (spec.certainty === 'confirmed') {
          ctx.addIssue({
            code: 'custom',
            path: path.split('.'),
            message: 'Sample data cannot confirm product information. Use "requires-verification" or "unknown".',
          });
        }
      }
    }
  });
export type Product = z.infer<typeof productSchema>;
