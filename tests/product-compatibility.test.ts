import { describe, expect, it } from 'vitest';
import {
  assessProduct,
  assessRoomProducts,
  checkClearance,
  checkIpRating,
  checkProductCompleteness,
  checkServices,
  checkSpaceFit,
  checkTapHoles,
  deriveOutcome,
  meetsIpRequirement,
  parseIpRating,
  type CompatibilityCheck,
} from '../design-system/utils/productCompatibility';
import { combineCertainty } from '../design-system/utils/status';
import { confirmed, makeProduct, makeRoom, sample, spec, unknown } from './fixtures';

const envelope = (width: number | null, depth: number | null, certainty: 'confirmed' | 'assumed' = 'confirmed') => ({
  id: 'env-1',
  label: 'niche',
  widthMm: width === null ? unknown() : spec(width, certainty),
  depthMm: depth === null ? unknown() : spec(depth, certainty),
});

describe('completeness', () => {
  it('treats a verified product as complete', () => {
    expect(checkProductCompleteness(makeProduct()).complete).toBe(true);
  });

  it('lists unknown and unconfirmed fields separately', () => {
    const wc = sample.products.find((p) => p.id === 'prd-wc-01');
    expect(wc).toBeDefined();
    const result = checkProductCompleteness(wc!);
    expect(result.complete).toBe(false);
    expect(result.missing.map((f) => f.label)).toEqual(expect.arrayContaining(['Model number', 'Width', 'Outlet set-out']));
    expect(result.unconfirmed.map((f) => f.label)).toContain('Brand');
  });

  it('flags category-specific fields that were never recorded', () => {
    const product = makeProduct();
    const { tapHoles, ...installation } = product.installation;
    expect(tapHoles).toBeDefined();
    const result = checkProductCompleteness({ ...product, installation });
    expect(result.missing).toContainEqual({ field: 'installation.tapHoles', label: 'Tap holes', certainty: 'not-recorded' });
  });
});

describe('space fit', () => {
  const product = makeProduct();

  it('passes with spare space', () => {
    expect(checkSpaceFit(product, envelope(600, 500)).result).toBe('pass');
  });

  it('warns on a tight fit', () => {
    const check = checkSpaceFit(product, envelope(510, 500));
    expect(check.result).toBe('warning');
    expect(check.message).toMatch(/Tight fit/);
  });

  it('fails when the product is larger than the space', () => {
    const check = checkSpaceFit(product, envelope(450, 500));
    expect(check.result).toBe('fail');
    expect(check.message).toContain('width by 50 mm');
  });

  it('cannot check unknown dimensions — and says which', () => {
    const check = checkSpaceFit(product, envelope(null, 500));
    expect(check.result).toBe('unknown');
    expect(check.message).toContain('available width');
  });

  it('inherits the weakest certainty of its inputs', () => {
    expect(checkSpaceFit(product, envelope(600, 500, 'assumed')).certainty).toBe('assumed');
  });
});

describe('clearances', () => {
  const product = makeProduct();
  it('applies the planning guidance thresholds', () => {
    expect(checkClearance(product, 'wcFrontClear', confirmed(550)).result).toBe('fail');
    expect(checkClearance(product, 'wcFrontClear', confirmed(700)).result).toBe('warning');
    expect(checkClearance(product, 'wcFrontClear', confirmed(800)).result).toBe('pass');
    expect(checkClearance(product, 'wcFrontClear', unknown()).result).toBe('unknown');
  });

  it('labels the result as guidance, not a code check', () => {
    expect(checkClearance(product, 'wcFrontClear', confirmed(800)).message).toContain('not a code check');
  });
});

describe('services', () => {
  const room = makeRoom();

  it('flags a wall-outlet WC in a room with a floor outlet', () => {
    const wc = sample.products.find((p) => p.id === 'prd-wc-01')!;
    const drainage = checkServices(wc, room).find((c) => c.id === 'services:drainage');
    expect(drainage?.result).toBe('warning');
    expect(drainage?.message).toMatch(/plumbing alteration/);
  });

  it('flags low site pressure against the product minimum', () => {
    const mixer = makeProduct({
      category: 'shower-mixer',
      installation: { ...makeProduct().installation, minWaterPressureBar: confirmed(1.5), tapHoles: undefined },
    });
    const pressure = checkServices(mixer, room).find((c) => c.id === 'services:pressure');
    expect(pressure?.result).toBe('warning');
    expect(pressure?.message).toContain('0.8 bar');
    expect(pressure?.certainty).toBe('requires-verification');
  });

  it('requires a new point when no matching electrical service exists', () => {
    const product = makeProduct({
      installation: { ...makeProduct().installation, electrical: confirmed('hardwired') },
    });
    const bare = makeRoom({ services: [] });
    expect(checkServices(product, bare).find((c) => c.id === 'services:electrical')?.result).toBe('warning');
  });
});

describe('IP ratings', () => {
  it('parses and compares IP codes', () => {
    expect(parseIpRating('IP44')).toEqual({ solids: 4, water: 4 });
    expect(parseIpRating('IPX4')).toEqual({ solids: null, water: 4 });
    expect(meetsIpRequirement('IP65', 'IPX4')).toBe(true);
    expect(meetsIpRequirement('IP20', 'IPX4')).toBe(false);
    expect(meetsIpRequirement('IPX4', 'IP44')).toBe(false);
  });

  it('checks a fixture against its zone', () => {
    expect(checkIpRating({ id: 'f', ipRating: confirmed('IP65') }, 'zone-1').result).toBe('pass');
    expect(checkIpRating({ id: 'f', ipRating: confirmed('IP20') }, 'zone-1').result).toBe('fail');
    expect(checkIpRating({ id: 'f', ipRating: unknown() }, 'zone-1').result).toBe('unknown');
    expect(checkIpRating({ id: 'f' }, 'outside-zones').result).toBe('pass');
  });
});

describe('pairings', () => {
  const basin = makeProduct();
  const mixer = (mounting: 'deck-mounted' | 'wall-mounted') =>
    makeProduct({
      id: 'prd-fixture-02',
      category: 'basin-mixer',
      installation: { ...basin.installation, mounting: confirmed(mounting), tapHoles: undefined },
    });

  it('matches deck mixers to tap-hole basins', () => {
    expect(checkTapHoles(basin, mixer('deck-mounted')).result).toBe('pass');
  });

  it('warns when a wall mixer leaves a tap hole unused', () => {
    expect(checkTapHoles(basin, mixer('wall-mounted')).result).toBe('warning');
  });

  it('fails a deck mixer on a no-hole basin that is not a countertop basin', () => {
    const noHole = makeProduct({
      installation: { ...basin.installation, mounting: confirmed('wall-hung'), tapHoles: confirmed(0) },
    });
    expect(checkTapHoles(noHole, mixer('deck-mounted')).result).toBe('fail');
  });

  it('cannot check when the tap-hole count is unknown', () => {
    const sampleBasin = sample.products.find((p) => p.id === 'prd-basin-01')!;
    const sampleMixer = sample.products.find((p) => p.id === 'prd-bmx-01')!;
    expect(checkTapHoles(sampleBasin, sampleMixer).result).toBe('unknown');
  });
});

describe('outcomes', () => {
  const check = (result: CompatibilityCheck['result']): CompatibilityCheck => ({
    id: result,
    label: result,
    result,
    certainty: 'confirmed',
    message: '',
    productIds: [],
  });

  it('ranks failures, then missing information, then conditions', () => {
    expect(deriveOutcome([check('pass'), check('warning'), check('unknown'), check('fail')])).toBe('incompatible');
    expect(deriveOutcome([check('pass'), check('warning'), check('unknown')])).toBe('cannot-determine');
    expect(deriveOutcome([check('pass'), check('warning')])).toBe('conditional');
    expect(deriveOutcome([check('pass')])).toBe('compatible');
    expect(deriveOutcome([])).toBe('cannot-determine');
  });

  it('combines certainty by the weakest link', () => {
    expect(combineCertainty('confirmed', 'assumed', 'requires-approval')).toBe('assumed');
    expect(combineCertainty('confirmed', 'unknown')).toBe('unknown');
    expect(combineCertainty()).toBe('confirmed');
  });

  it('reports a verified product that fits as compatible and confirmed', () => {
    const report = assessProduct(makeProduct(), { envelope: envelope(600, 500) });
    expect(report.outcome).toBe('compatible');
    expect(report.certainty).toBe('confirmed');
    expect(report.missingInformation).toEqual([]);
  });
});

describe('sample bathroom', () => {
  const reports = assessRoomProducts(sample.bathroom, sample.products);

  it('assesses every product assigned to the room', () => {
    expect(Object.keys(reports).sort()).toEqual([...sample.bathroom.productIds].sort());
  });

  it('never reports sample products as compatible', () => {
    for (const report of Object.values(reports)) expect(report.outcome).toBe('cannot-determine');
  });

  it('still runs the checks it can, using the room allowances', () => {
    const wc = reports['prd-wc-01']!;
    expect(wc.checks.find((c) => c.id === 'clearance:wcFrontClear')?.result).toBe('warning');
    expect(wc.checks.find((c) => c.id === 'services:drainage')?.result).toBe('warning');
    const vanity = reports['prd-vanity-01']!;
    expect(vanity.checks.find((c) => c.id === 'fit:fa-vanity')?.result).toBe('pass');
    expect(vanity.checks.find((c) => c.id === 'fit:fa-vanity')?.certainty).toBe('requires-approval');
  });

  it('checks the shower downlight against zone 1', () => {
    const downlight = reports['prd-downlight-01']!;
    expect(downlight.checks.find((c) => c.id === 'ip:zone-1')?.result).toBe('unknown');
  });
});

describe('room assessment found in review', () => {
  const ip20Light = () =>
    makeProduct({
      id: 'prd-ip20-light',
      category: 'lighting',
      installation: { ...makeProduct().installation, electrical: confirmed('hardwired'), ipRating: confirmed('IP20') },
    });

  const roomWith = (product: ReturnType<typeof makeProduct>, zones: ('zone-1' | 'outside-zones')[]) => {
    const room = makeRoom();
    const template = room.lighting!.fixtures[0]!;
    room.productIds = [product.id];
    room.fixtureAllowances = [];
    room.lighting!.fixtures = zones.map((zone, i) => ({ ...template, id: `fx-${i}`, productId: product.id, bathroomZone: zone }));
    return room;
  };

  it('checks every zone a product is used in, regardless of order', () => {
    const light = ip20Light();
    for (const zones of [['zone-1', 'outside-zones'], ['outside-zones', 'zone-1']] as const) {
      expect(assessRoomProducts(roomWith(light, [...zones]), [light])[light.id]?.outcome).toBe('incompatible');
    }
  });

  it('cannot clear an electrical item in a wet room that has no zone', () => {
    const heater = makeProduct({
      id: 'prd-heater',
      category: 'water-heater',
      installation: { ...makeProduct().installation, electrical: confirmed('socket-16a'), ipRating: confirmed('IP20') },
    });
    const report = assessRoomProducts(roomWith(heater, []), [heater])[heater.id];
    expect(report?.checks.map((c) => c.id)).toContain('ip:zone-unassigned');
    expect(report?.outcome).not.toBe('compatible');
  });
});
