import { z } from 'zod';
import { BATHROOM_ZONES, LIGHTING_LAYERS } from '../tokens';
import { certaintySchema, idSchema, specValue, statementSchema, textSchema } from './common';
import { ipRatingSchema } from './product';

export const FIXTURE_MOUNTINGS = [
  'recessed',
  'surface',
  'pendant',
  'wall',
  'cove',
  'track',
  'integrated',
  'under-cabinet',
] as const;

export const LIGHTING_CONTROLS = ['switch', 'dimmer', 'scene', 'sensor', 'smart'] as const;

export const lightingFixtureSchema = z.object({
  id: idSchema,
  label: textSchema,
  layer: z.enum(LIGHTING_LAYERS),
  /** Link to a product record when a specific fixture has been proposed. */
  productId: idSchema.optional(),
  quantity: specValue(z.number().int().positive()),
  mounting: specValue(z.enum(FIXTURE_MOUNTINGS)),
  colourTemperatureK: specValue(z.number().int().min(1800).max(6500)),
  cri: specValue(z.number().min(0).max(100)),
  lumens: specValue(z.number().positive()),
  beamAngleDeg: specValue(z.number().positive().max(180)).optional(),
  ipRating: specValue(ipRatingSchema),
  dimmable: specValue(z.boolean()),
  control: specValue(z.enum(LIGHTING_CONTROLS)),
  /** Bathroom zone the fixture sits in, which sets its minimum IP rating. */
  bathroomZone: z.enum(BATHROOM_ZONES).optional(),
  notes: z.array(statementSchema),
});
export type LightingFixture = z.infer<typeof lightingFixtureSchema>;

export const illuminanceTargetSchema = z
  .object({
    id: idSchema,
    task: textSchema,
    minLux: z.number().positive(),
    maxLux: z.number().positive(),
    certainty: certaintySchema,
    basis: textSchema,
  })
  .refine((target) => target.minLux <= target.maxLux, { message: 'minLux must not exceed maxLux', path: ['maxLux'] });

export const lightingPlanSchema = z.object({
  id: idSchema,
  roomId: idSchema,
  intent: textSchema,
  targets: z.array(illuminanceTargetSchema),
  fixtures: z.array(lightingFixtureSchema),
  controls: z.array(statementSchema),
  notes: z.array(statementSchema),
});
export type LightingPlan = z.infer<typeof lightingPlanSchema>;
