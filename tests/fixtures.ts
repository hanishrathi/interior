import { z } from 'zod';
import client from '../design-system/data/sample-client.json';
import bathroom from '../design-system/data/sample-bathroom.json';
import materials from '../design-system/data/sample-materials.json';
import products from '../design-system/data/sample-products.json';
import project from '../design-system/data/sample-project.json';
import { clientSchema } from '../design-system/schemas/client';
import type { Certainty } from '../design-system/schemas/common';
import { materialSchema, type Material } from '../design-system/schemas/material';
import { productSchema, type Product } from '../design-system/schemas/product';
import { projectSchema } from '../design-system/schemas/project';
import { roomSchema, type Room } from '../design-system/schemas/room';

/** Parsed sample dataset (throws if the sample data ever stops matching the schemas). */
export const sample = {
  client: clientSchema.parse(client),
  project: projectSchema.parse(project),
  bathroom: roomSchema.parse(bathroom),
  products: z.array(productSchema).parse(products),
  materials: z.array(materialSchema).parse(materials),
};

export const raw = { client, project, bathroom, products, materials };

/** Deep copy for tests that mutate records before re-parsing. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

const FIXTURE_SOURCE = 'Test fixture — fictional specification sheet FB-100 rev 2';

export const confirmed = <T>(value: T) => ({ value, certainty: 'confirmed' as const, source: FIXTURE_SOURCE });
export const unknown = () => ({ value: null, certainty: 'unknown' as const });
export const spec = <T>(value: T, certainty: Certainty) =>
  certainty === 'confirmed'
    ? confirmed(value)
    : certainty === 'assumed'
      ? { value, certainty, note: 'Test assumption.' }
      : { value, certainty, source: 'Test fixture' };

/**
 * A fully verified, fictional product ("Fixture Brand"). Used only to exercise the logic —
 * it describes no real product.
 */
export function makeProduct(overrides: Partial<Product> = {}): Product {
  return productSchema.parse({
    id: 'prd-fixture-01',
    name: 'Fixture basin',
    category: 'basin',
    brand: confirmed('Fixture Brand'),
    modelNumber: confirmed('FB-100'),
    source: { kind: 'manufacturer-documentation', reference: 'Fixture Brand sheet FB-100', isSample: false },
    dimensions: { widthMm: confirmed(500), depthMm: confirmed(400), heightMm: confirmed(150) },
    finish: { name: confirmed('White'), code: confirmed('W1') },
    installation: {
      mounting: confirmed('countertop'),
      waterSupply: confirmed('hot-and-cold'),
      drainage: confirmed('waste-outlet'),
      electrical: confirmed('none'),
      tapHoles: confirmed(1),
      requiredComponents: [],
      notes: [],
    },
    status: 'selected',
    verification: {
      state: 'verified',
      verifiedBy: 'Test reviewer',
      verifiedOn: '2026-09-01',
      method: 'manufacturer-documentation',
    },
    roomIds: ['rm-parents-bathroom'],
    quantity: confirmed(1),
    documents: [],
    ...overrides,
  });
}

export function makeMaterial(overrides: Partial<Material> = {}): Material {
  return materialSchema.parse({ ...clone(sample.materials[1]), ...overrides });
}

export function makeRoom(overrides: Partial<Room> = {}): Room {
  return roomSchema.parse({ ...clone(sample.bathroom), ...overrides });
}
