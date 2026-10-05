import { z } from 'zod';
import { planningGuidance } from '../tokens';
import {
  certaintySchema,
  idSchema,
  millimetresSchema,
  recommendationSchema,
  specValue,
  statementSchema,
  textSchema,
} from './common';
import { lightingPlanSchema } from './lighting';

export const ROOM_TYPES = [
  'living',
  'dining',
  'kitchen',
  'bedroom',
  'master-bedroom',
  'bathroom',
  'powder-room',
  'pooja',
  'balcony',
  'utility',
  'study',
  'foyer',
  'corridor',
  'wardrobe',
  'other',
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const WET_ROOM_TYPES: readonly RoomType[] = ['bathroom', 'powder-room'];

export const ROOM_STATUSES = ['not-started', 'in-progress', 'client-review', 'approved', 'on-hold'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const openingSchema = z.object({
  id: idSchema,
  kind: z.enum(['door', 'window', 'ventilator', 'opening']),
  /** Wall reference used on the drawings, e.g. "Wall A (entrance)". */
  wall: textSchema,
  widthMm: specValue(millimetresSchema),
  heightMm: specValue(millimetresSchema),
  sillHeightMm: specValue(z.number().nonnegative()).optional(),
  operation: specValue(z.enum(['inward', 'outward', 'sliding', 'pocket', 'fixed', 'top-hung', 'none'])).optional(),
  notes: z.array(statementSchema),
});

export const SERVICE_KINDS = [
  'water-cold',
  'water-hot',
  'wc-floor-outlet',
  'wc-wall-outlet',
  'floor-trap',
  'waste-outlet',
  'electrical-socket',
  'electrical-point',
  'lighting-point',
  'exhaust',
  'gas',
] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

export const serviceSchema = z.object({
  id: idSchema,
  kind: z.enum(SERVICE_KINDS),
  label: textSchema,
  state: z.enum(['existing', 'proposed', 'relocate', 'remove']),
  /** Location or set-out description with certainty, e.g. "300 mm from Wall B (site-measured)". */
  location: specValue(textSchema),
});
export type RoomService = z.infer<typeof serviceSchema>;

export const REQUIREMENT_CATEGORIES = [
  'function',
  'accessibility',
  'safety',
  'storage',
  'aesthetic',
  'services',
  'maintenance',
  'budget',
  'cultural',
  'lighting',
] as const;
export const REQUIREMENT_PRIORITIES = ['must', 'should', 'could'] as const;
export const REQUIREMENT_SOURCES = ['client', 'site', 'designer', 'regulation', 'consultant'] as const;
export const REQUIREMENT_STATUSES = ['met', 'partially-met', 'not-met', 'not-assessed'] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];
export type RequirementPriority = (typeof REQUIREMENT_PRIORITIES)[number];

export const requirementSchema = z.object({
  id: idSchema,
  text: textSchema,
  category: z.enum(REQUIREMENT_CATEGORIES),
  priority: z.enum(REQUIREMENT_PRIORITIES),
  source: z.enum(REQUIREMENT_SOURCES),
  certainty: certaintySchema,
  status: z.enum(REQUIREMENT_STATUSES),
  /** Product, material or recommendation ids that address the requirement. */
  addressedBy: z.array(idSchema),
  notes: textSchema.optional(),
});
export type Requirement = z.infer<typeof requirementSchema>;

/**
 * Space reserved on the layout for a fixture. Drives fit and clearance checks before a
 * product's real dimensions are known — the allowance is the designer's, not the manufacturer's.
 */
export const fixtureAllowanceSchema = z.object({
  id: idSchema,
  label: textSchema,
  productId: idSchema.optional(),
  widthMm: specValue(millimetresSchema),
  depthMm: specValue(millimetresSchema),
  heightMm: specValue(millimetresSchema).optional(),
  frontClearance: z
    .object({
      guidance: textSchema.refine((key) => key in planningGuidance.clearances, 'Unknown planning clearance key.'),
      availableMm: specValue(millimetresSchema),
    })
    .optional(),
});
export type FixtureAllowance = z.infer<typeof fixtureAllowanceSchema>;

export const bathroomZoneSchema = z.object({
  id: idSchema,
  kind: z.enum(['wet', 'dry']),
  label: textSchema,
  widthMm: specValue(millimetresSchema),
  depthMm: specValue(millimetresSchema),
});

export const bathroomDetailsSchema = z.object({
  zones: z.array(bathroomZoneSchema).min(1),
  waterproofing: statementSchema,
  drainage: statementSchema,
  ventilation: statementSchema,
  hotWater: statementSchema,
});

export const roomSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    name: textSchema,
    type: z.enum(ROOM_TYPES),
    level: textSchema,
    status: z.enum(ROOM_STATUSES),
    dimensions: z.object({
      lengthMm: specValue(millimetresSchema),
      widthMm: specValue(millimetresSchema),
      /** Floor to slab soffit. */
      ceilingHeightMm: specValue(millimetresSchema),
      /** Floor to underside of the proposed false ceiling, where one is proposed. */
      falseCeilingHeightMm: specValue(millimetresSchema).optional(),
    }),
    openings: z.array(openingSchema),
    services: z.array(serviceSchema),
    siteConditions: z.object({
      waterPressureBar: specValue(z.number().positive()).optional(),
      wallConstruction: specValue(textSchema),
      /** Depth available below finished floor (sunken slab), for wet areas. */
      sunkenDepthMm: specValue(z.number().nonnegative()).optional(),
      notes: z.array(statementSchema),
    }),
    requirements: z.array(requirementSchema),
    recommendations: z.array(recommendationSchema),
    fixtureAllowances: z.array(fixtureAllowanceSchema),
    productIds: z.array(idSchema),
    materialIds: z.array(idSchema),
    lighting: lightingPlanSchema.optional(),
    bathroom: bathroomDetailsSchema.optional(),
    notes: z.array(statementSchema),
  })
  .superRefine((room, ctx) => {
    if (WET_ROOM_TYPES.includes(room.type) && !room.bathroom) {
      ctx.addIssue({
        code: 'custom',
        path: ['bathroom'],
        message: 'Bathrooms must record wet/dry zones, waterproofing, drainage, ventilation and hot water.',
      });
    }
    if (room.lighting && room.lighting.roomId !== room.id) {
      ctx.addIssue({ code: 'custom', path: ['lighting', 'roomId'], message: 'Lighting plan must reference this room.' });
    }
    const ceiling = room.dimensions.ceilingHeightMm.value;
    const falseCeiling = room.dimensions.falseCeilingHeightMm?.value;
    if (ceiling !== null && falseCeiling !== null && falseCeiling !== undefined && falseCeiling >= ceiling) {
      ctx.addIssue({
        code: 'custom',
        path: ['dimensions', 'falseCeilingHeightMm'],
        message: 'The false ceiling must sit below the slab soffit.',
      });
    }
    const ids = [
      ...room.requirements.map((r) => r.id),
      ...room.recommendations.map((r) => r.id),
      ...room.openings.map((o) => o.id),
      ...room.services.map((s) => s.id),
      ...room.fixtureAllowances.map((a) => a.id),
    ];
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      ctx.addIssue({ code: 'custom', path: [], message: `Duplicate ids within room: ${[...new Set(duplicates)].join(', ')}.` });
    }
  });
export type Room = z.infer<typeof roomSchema>;
