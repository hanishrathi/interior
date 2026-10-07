import type { Certainty, SpecValue } from '../schemas/common';
import type { Product, ProductCategory } from '../schemas/product';
import { WET_ROOM_TYPES, type FixtureAllowance, type Room, type ServiceKind } from '../schemas/room';
import { lightingTokens, planningGuidance, type BathroomZone, type PlanningClearanceKey } from '../tokens';
import { formatBar, formatMm, humanize } from './formatting';
import { combineCertainty, type CheckResult, type CompatibilityOutcome } from './status';

/**
 * Product compatibility checks. Every check reports a result *and* the certainty of the
 * information it used: a "pass" computed from assumed dimensions is an assumed pass.
 * Missing information yields `unknown` — never an optimistic default.
 */

export interface CompatibilityCheck {
  id: string;
  label: string;
  result: CheckResult;
  certainty: Certainty;
  message: string;
  productIds: string[];
}

export interface CompatibilityReport {
  productId: string;
  outcome: CompatibilityOutcome;
  /** The weakest certainty among all checks. */
  certainty: Certainty;
  checks: CompatibilityCheck[];
  /** What must be found out before the outcome can be relied on. */
  missingInformation: string[];
}

/** Margin below which a fit is flagged as tight (site tolerances, tiling build-up, fixings). */
export const INSTALLATION_TOLERANCE_MM = 20;

const check = (
  id: string,
  label: string,
  result: CheckResult,
  certainty: Certainty,
  message: string,
  productIds: string[],
): CompatibilityCheck => ({ id, label, result, certainty, message, productIds });

// ---------------------------------------------------------------------------
// Completeness
// ---------------------------------------------------------------------------

export interface ProductField {
  field: string;
  label: string;
  /** `not-recorded` means the field applies to this category but is absent from the record. */
  certainty: Certainty | 'not-recorded';
}

export interface ProductCompleteness {
  productId: string;
  /** True only when every applicable field is known and confirmed. */
  complete: boolean;
  /** Applicable fields whose value is missing. */
  missing: ProductField[];
  /** Fields with a value that is not yet confirmed. */
  unconfirmed: ProductField[];
}

type FieldEntry = [field: string, label: string, spec: SpecValue<unknown> | undefined];

const IP_RATED_CATEGORIES: readonly ProductCategory[] = ['lighting', 'water-heater', 'switch-socket'];

function needsIpRating(product: Product): boolean {
  if (IP_RATED_CATEGORIES.includes(product.category)) return true;
  const electrical = product.installation.electrical.value;
  return electrical !== null && electrical !== 'none';
}

/** Category-specific installation fields that must be recorded (even if only as unknown). */
export function getApplicableInstallationFields(product: Product): FieldEntry[] {
  const { installation } = product;
  const fields: FieldEntry[] = [];
  if (product.category === 'wc') fields.push(['installation.outletSetOutMm', 'Outlet set-out', installation.outletSetOutMm]);
  if (product.category === 'basin' || product.category === 'kitchen-sink') {
    fields.push(['installation.tapHoles', 'Tap holes', installation.tapHoles]);
  }
  if (product.category === 'shower-mixer' || product.category === 'shower-head') {
    fields.push(['installation.minWaterPressureBar', 'Minimum water pressure', installation.minWaterPressureBar]);
  }
  if (needsIpRating(product)) fields.push(['installation.ipRating', 'IP rating', installation.ipRating]);
  return fields;
}

export function checkProductCompleteness(product: Product): ProductCompleteness {
  const entries: FieldEntry[] = [
    ['brand', 'Brand', product.brand],
    ['modelNumber', 'Model number', product.modelNumber],
    ['dimensions.widthMm', 'Width', product.dimensions.widthMm],
    ['dimensions.depthMm', 'Depth', product.dimensions.depthMm],
    ['dimensions.heightMm', 'Height', product.dimensions.heightMm],
    ['finish.name', 'Finish', product.finish.name],
    ['installation.mounting', 'Mounting', product.installation.mounting],
    ['installation.waterSupply', 'Water supply', product.installation.waterSupply],
    ['installation.drainage', 'Drainage', product.installation.drainage],
    ['installation.electrical', 'Electrical', product.installation.electrical],
    ['quantity', 'Quantity', product.quantity],
    ...getApplicableInstallationFields(product),
  ];

  const missing: ProductField[] = [];
  const unconfirmed: ProductField[] = [];
  for (const [field, label, spec] of entries) {
    if (!spec) missing.push({ field, label, certainty: 'not-recorded' });
    else if (spec.value === null) missing.push({ field, label, certainty: spec.certainty });
    else if (spec.certainty !== 'confirmed') unconfirmed.push({ field, label, certainty: spec.certainty });
  }
  return { productId: product.id, complete: missing.length === 0 && unconfirmed.length === 0, missing, unconfirmed };
}

function completenessCheck(product: Product): CompatibilityCheck {
  const { missing, unconfirmed } = checkProductCompleteness(product);
  const label = 'Product information';
  if (missing.length > 0) {
    return check(
      'information',
      label,
      'unknown',
      'unknown',
      `Missing: ${missing.map((f) => f.label.toLowerCase()).join(', ')}.`,
      [product.id],
    );
  }
  if (unconfirmed.length > 0) {
    return check(
      'information',
      label,
      'warning',
      combineCertainty(...unconfirmed.map((f) => f.certainty as Certainty)),
      `Not yet confirmed: ${unconfirmed.map((f) => f.label.toLowerCase()).join(', ')}.`,
      [product.id],
    );
  }
  return check('information', label, 'pass', 'confirmed', 'All applicable information is confirmed.', [product.id]);
}

// ---------------------------------------------------------------------------
// Space fit and clearances
// ---------------------------------------------------------------------------

export interface SpaceEnvelope {
  id: string;
  label: string;
  widthMm: SpecValue<number>;
  depthMm: SpecValue<number>;
  heightMm?: SpecValue<number> | undefined;
}

export function checkSpaceFit(product: Product, envelope: SpaceEnvelope): CompatibilityCheck {
  const pairs: [string, SpecValue<number>, SpecValue<number>][] = [
    ['width', product.dimensions.widthMm, envelope.widthMm],
    ['depth', product.dimensions.depthMm, envelope.depthMm],
  ];
  if (envelope.heightMm) pairs.push(['height', product.dimensions.heightMm, envelope.heightMm]);

  const id = `fit:${envelope.id}`;
  const label = `Fits ${envelope.label}`;
  const certainty = combineCertainty(...pairs.flatMap(([, a, b]) => [a.certainty, b.certainty]));

  const unknowns = pairs.flatMap(([name, productDim, spaceDim]) => [
    ...(productDim.value === null ? [`product ${name}`] : []),
    ...(spaceDim.value === null ? [`available ${name}`] : []),
  ]);
  if (unknowns.length > 0) {
    return check(id, label, 'unknown', 'unknown', `Cannot check fit: ${unknowns.join(', ')} unknown.`, [product.id]);
  }

  const margins = pairs.map(([name, productDim, spaceDim]) => ({
    name,
    margin: (spaceDim.value as number) - (productDim.value as number),
  }));
  const over = margins.filter((m) => m.margin < 0);
  if (over.length > 0) {
    const detail = over.map((m) => `${m.name} by ${formatMm(-m.margin)}`).join(', ');
    return check(id, label, 'fail', certainty, `Exceeds the available space: ${detail}.`, [product.id]);
  }
  const tight = margins.filter((m) => m.margin < INSTALLATION_TOLERANCE_MM);
  if (tight.length > 0) {
    const detail = tight.map((m) => `${m.name} ${formatMm(m.margin)}`).join(', ');
    return check(
      id,
      label,
      'warning',
      certainty,
      `Tight fit (${detail} spare). Confirm site dimensions, finishes build-up and installation tolerances.`,
      [product.id],
    );
  }
  const detail = margins.map((m) => `${m.name} ${formatMm(m.margin)}`).join(', ');
  return check(id, label, 'pass', certainty, `Fits with ${detail} spare.`, [product.id]);
}

export function checkClearance(product: Product, key: PlanningClearanceKey, availableMm: SpecValue<number>): CompatibilityCheck {
  const guidance = planningGuidance.clearances[key];
  const id = `clearance:${key}`;
  const label = guidance.label;
  const basis = `planning guidance (${formatMm(guidance.minimum)} minimum, ${formatMm(guidance.recommended)} recommended) — not a code check`;
  if (availableMm.value === null) {
    return check(id, label, 'unknown', 'unknown', `Available clearance unknown; ${basis}.`, [product.id]);
  }
  const available = availableMm.value;
  if (available < guidance.minimum) {
    return check(id, label, 'fail', availableMm.certainty, `${formatMm(available)} is below the ${basis}.`, [product.id]);
  }
  if (available < guidance.recommended) {
    return check(
      id,
      label,
      'warning',
      availableMm.certainty,
      `${formatMm(available)} meets the minimum but not the recommended clearance; ${basis}.`,
      [product.id],
    );
  }
  return check(id, label, 'pass', availableMm.certainty, `${formatMm(available)} meets the ${basis}.`, [product.id]);
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

function liveServices(room: Room, kinds: readonly ServiceKind[]) {
  return room.services.filter((service) => kinds.includes(service.kind) && service.state !== 'remove');
}

export function checkServices(product: Product, room: Room): CompatibilityCheck[] {
  const { installation } = product;
  const checks: CompatibilityCheck[] = [];
  const ids = [product.id];

  // WC outlet type (floor outlet ≈ S-trap, wall outlet ≈ P-trap / wall-hung)
  const drainage = installation.drainage;
  if (product.category === 'wc' || drainage.value === 'floor-outlet' || drainage.value === 'wall-outlet') {
    const label = 'WC outlet';
    if (drainage.value === null) {
      checks.push(check('services:drainage', label, 'unknown', 'unknown', 'Product outlet type unknown.', ids));
    } else if (drainage.value === 'floor-outlet' || drainage.value === 'wall-outlet') {
      const needed: ServiceKind = drainage.value === 'wall-outlet' ? 'wc-wall-outlet' : 'wc-floor-outlet';
      const other: ServiceKind = needed === 'wc-wall-outlet' ? 'wc-floor-outlet' : 'wc-wall-outlet';
      const match = liveServices(room, [needed]);
      const mismatch = liveServices(room, [other]);
      if (match.length > 0) {
        const certainty = combineCertainty(drainage.certainty, ...match.map((s) => s.location.certainty));
        checks.push(check('services:drainage', label, 'pass', certainty, `${humanize(needed)} available.`, ids));
      } else if (mismatch.length > 0) {
        checks.push(
          check(
            'services:drainage',
            label,
            'warning',
            combineCertainty(drainage.certainty, 'requires-verification'),
            `Product needs a ${humanize(needed).toLowerCase()}; the room has a ${humanize(other).toLowerCase()}. Converting requires plumbing alteration — confirm feasibility (sunken depth, fall to the stack) with the plumber.`,
            ids,
          ),
        );
      } else {
        checks.push(check('services:drainage', label, 'unknown', 'unknown', 'No WC outlet recorded for this room.', ids));
      }
    }
  }

  // Water pressure
  if (installation.minWaterPressureBar) {
    const label = 'Water pressure';
    const minimum = installation.minWaterPressureBar;
    const site = room.siteConditions.waterPressureBar;
    if (minimum.value === null) {
      checks.push(check('services:pressure', label, 'unknown', 'unknown', 'Product minimum working pressure unknown.', ids));
    } else if (!site || site.value === null) {
      checks.push(check('services:pressure', label, 'unknown', 'unknown', 'Site water pressure not recorded.', ids));
    } else if (site.value < minimum.value) {
      checks.push(
        check(
          'services:pressure',
          label,
          'warning',
          combineCertainty(minimum.certainty, site.certainty),
          `Site pressure ${formatBar(site.value)} is below the product minimum ${formatBar(minimum.value)}. A pressure pump would be needed — requires approval.`,
          ids,
        ),
      );
    } else {
      checks.push(
        check(
          'services:pressure',
          label,
          'pass',
          combineCertainty(minimum.certainty, site.certainty),
          `Site pressure ${formatBar(site.value)} meets the minimum ${formatBar(minimum.value)}.`,
          ids,
        ),
      );
    }
  }

  // Hot water
  const supply = installation.waterSupply;
  if (supply.value === null) {
    checks.push(check('services:hot-water', 'Hot water', 'unknown', 'unknown', 'Product water-supply type unknown.', ids));
  } else if (supply.value === 'hot' || supply.value === 'hot-and-cold') {
    const hot = liveServices(room, ['water-hot']);
    checks.push(
      hot.length > 0
        ? check(
            'services:hot-water',
            'Hot water',
            'pass',
            combineCertainty(supply.certainty, ...hot.map((s) => s.location.certainty)),
            'Hot-water supply available.',
            ids,
          )
        : check(
            'services:hot-water',
            'Hot water',
            'warning',
            supply.certainty,
            'No hot-water supply recorded in this room — a new supply or water heater is required.',
            ids,
          ),
    );
  }

  // Electrical
  const electrical = installation.electrical;
  if (electrical.value === null) {
    checks.push(check('services:electrical', 'Electrical', 'unknown', 'unknown', 'Product electrical requirement unknown.', ids));
  } else if (electrical.value !== 'none') {
    const kinds: ServiceKind[] =
      electrical.value === 'hardwired' || electrical.value === 'low-voltage-driver'
        ? ['electrical-point', 'lighting-point']
        : ['electrical-socket'];
    const points = liveServices(room, kinds);
    checks.push(
      points.length > 0
        ? check(
            'services:electrical',
            'Electrical',
            'pass',
            combineCertainty(electrical.certainty, ...points.map((s) => s.location.certainty)),
            `${humanize(electrical.value)} available.`,
            ids,
          )
        : check(
            'services:electrical',
            'Electrical',
            'warning',
            electrical.certainty,
            `Needs a ${humanize(electrical.value).toLowerCase()} — none recorded. Add a new point to the electrical layout.`,
            ids,
          ),
    );
  }

  return checks;
}

// ---------------------------------------------------------------------------
// Ingress protection
// ---------------------------------------------------------------------------

export interface IpDigits {
  solids: number | null;
  water: number | null;
}

/** `IP44` → `{ solids: 4, water: 4 }`; `X` means "not rated" → `null`. */
export function parseIpRating(code: string): IpDigits {
  const digit = (char: string | undefined) => (char === undefined || char === 'X' ? null : Number(char));
  return { solids: digit(code[2]), water: digit(code[3]) };
}

/** True when `actual` meets `minimum` on every rated digit. An `X` in `actual` fails a rated minimum. */
export function meetsIpRequirement(actual: string, minimum: string): boolean {
  const have = parseIpRating(actual);
  const need = parseIpRating(minimum);
  const ok = (has: number | null, needs: number | null) => needs === null || (has !== null && has >= needs);
  return ok(have.solids, need.solids) && ok(have.water, need.water);
}

export function checkIpRating(
  item: { id: string; ipRating?: SpecValue<string> | undefined },
  zone: BathroomZone,
  zoneCertainty: Certainty = 'requires-verification',
): CompatibilityCheck {
  const { minimumIp, label: zoneLabel } = lightingTokens.bathroomZones[zone];
  const id = `ip:${zone}`;
  const label = `IP rating for ${zoneLabel}`;
  if (minimumIp === null) {
    return check(id, label, 'pass', zoneCertainty, `${zoneLabel} has no minimum IP rating; confirm suitability with the electrical consultant.`, [item.id]);
  }
  const rating = item.ipRating;
  if (!rating || rating.value === null) {
    return check(id, label, 'unknown', 'unknown', `IP rating unknown — ${zoneLabel} requires at least ${minimumIp}.`, [item.id]);
  }
  const certainty = combineCertainty(rating.certainty, zoneCertainty);
  return meetsIpRequirement(rating.value, minimumIp)
    ? check(id, label, 'pass', certainty, `${rating.value} meets the ${zoneLabel} minimum of ${minimumIp}.`, [item.id])
    : check(id, label, 'fail', certainty, `${rating.value} is below the ${zoneLabel} minimum of ${minimumIp}.`, [item.id]);
}

// ---------------------------------------------------------------------------
// Pairings
// ---------------------------------------------------------------------------

export function checkTapHoles(basin: Product, mixer: Product): CompatibilityCheck {
  const ids = [basin.id, mixer.id];
  const id = `pairing:${basin.id}:${mixer.id}`;
  const label = 'Basin and mixer';
  const mount = mixer.installation.mounting;
  const holes = basin.installation.tapHoles;
  if (mount.value === null) return check(id, label, 'unknown', 'unknown', 'Mixer mounting type unknown.', ids);
  if (!holes || holes.value === null) return check(id, label, 'unknown', 'unknown', 'Basin tap-hole count unknown.', ids);
  const certainty = combineCertainty(mount.certainty, holes.certainty);

  if (mount.value === 'wall-mounted') {
    return holes.value === 0
      ? check(id, label, 'pass', certainty, 'Wall-mounted mixer with a no-hole basin. Confirm spout reach to the basin centre.', ids)
      : check(id, label, 'warning', certainty, 'Basin has an unused tap hole — choose a no-hole variant or specify a blanking cap.', ids);
  }
  if (mount.value === 'deck-mounted') {
    if (holes.value >= 1) return check(id, label, 'pass', certainty, 'Deck-mounted mixer with a tap-hole basin.', ids);
    if (basin.installation.mounting.value === 'countertop') {
      return check(
        id,
        label,
        'warning',
        combineCertainty(certainty, basin.installation.mounting.certainty),
        'Mixer must mount on the counter beside the basin — confirm spout height and reach clear the basin rim.',
        ids,
      );
    }
    return check(id, label, 'fail', certainty, 'Deck-mounted mixer needs a tap hole; the basin has none.', ids);
  }
  return check(id, label, 'unknown', certainty, `Unexpected mixer mounting "${mount.value}".`, ids);
}

export function checkManufacturerPairing(a: Product, b: Product, label: string): CompatibilityCheck {
  const ids = [a.id, b.id];
  const id = `pairing:${a.id}:${b.id}`;
  if (a.brand.value === null || b.brand.value === null || a.modelNumber.value === null || b.modelNumber.value === null) {
    return check(id, label, 'unknown', 'unknown', 'Confirm this pairing once both brands and model numbers are known.', ids);
  }
  const certainty = combineCertainty(a.modelNumber.certainty, b.modelNumber.certainty, 'requires-verification');
  return a.brand.value.toLowerCase() === b.brand.value.toLowerCase()
    ? check(id, label, 'pass', certainty, "Same manufacturer — confirm the pairing in the manufacturer's documentation.", ids)
    : check(id, label, 'warning', certainty, 'Cross-manufacturer pairing — confirm compatibility with both manufacturers.', ids);
}

interface PairingRule {
  first: ProductCategory;
  second: ProductCategory;
  run: (first: Product, second: Product) => CompatibilityCheck;
}

export const PAIRING_RULES: readonly PairingRule[] = [
  { first: 'basin', second: 'basin-mixer', run: checkTapHoles },
  { first: 'wc', second: 'concealed-cistern', run: (a, b) => checkManufacturerPairing(a, b, 'WC and concealed cistern') },
  { first: 'shower-mixer', second: 'shower-head', run: (a, b) => checkManufacturerPairing(a, b, 'Shower mixer and shower head') },
];

export function checkPairings(product: Product, others: readonly Product[]): CompatibilityCheck[] {
  const checks: CompatibilityCheck[] = [];
  for (const other of others) {
    if (other.id === product.id) continue;
    for (const rule of PAIRING_RULES) {
      if (product.category === rule.first && other.category === rule.second) checks.push(rule.run(product, other));
      else if (product.category === rule.second && other.category === rule.first) checks.push(rule.run(other, product));
    }
  }
  return checks;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export interface ProductContext {
  room?: Room;
  envelope?: SpaceEnvelope;
  clearances?: { key: PlanningClearanceKey; availableMm: SpecValue<number> }[];
  bathroomZone?: { zone: BathroomZone; certainty: Certainty };
  /** Every zone the product is used in; each is checked, so order never matters. */
  bathroomZones?: { zone: BathroomZone; certainty: Certainty }[];
  /** Further allowances the same product occupies (each is fitted and clearance-checked). */
  additionalAllowances?: FixtureAllowance[];
  /** The product is electrical and sits in a wet room, but no zone has been assigned. */
  zoneUnassigned?: boolean;
  pairedProducts?: readonly Product[];
}

/** Failures dominate; then missing information; then conditions. */
export function deriveOutcome(checks: readonly CompatibilityCheck[]): CompatibilityOutcome {
  if (checks.length === 0) return 'cannot-determine';
  if (checks.some((c) => c.result === 'fail')) return 'incompatible';
  if (checks.some((c) => c.result === 'unknown')) return 'cannot-determine';
  if (checks.some((c) => c.result === 'warning')) return 'conditional';
  return 'compatible';
}

export function assessProduct(product: Product, context: ProductContext = {}): CompatibilityReport {
  const checks: CompatibilityCheck[] = [completenessCheck(product)];
  if (context.envelope) checks.push(checkSpaceFit(product, context.envelope));
  for (const clearance of context.clearances ?? []) checks.push(checkClearance(product, clearance.key, clearance.availableMm));
  if (context.room) checks.push(...checkServices(product, context.room));
  const zones = [...(context.bathroomZone ? [context.bathroomZone] : []), ...(context.bathroomZones ?? [])];
  for (const { zone, certainty } of zones) {
    checks.push(checkIpRating({ id: product.id, ipRating: product.installation.ipRating }, zone, certainty));
  }
  for (const allowance of context.additionalAllowances ?? []) {
    checks.push({ ...checkSpaceFit(product, envelopeFromAllowance(allowance)), id: `fit:${allowance.id}` });
    const clearance = allowance.frontClearance;
    if (clearance && isClearanceKey(clearance.guidance)) checks.push(checkClearance(product, clearance.guidance, clearance.availableMm));
  }
  if (context.zoneUnassigned) {
    checks.push({
      id: 'ip:zone-unassigned',
      label: 'Bathroom zone',
      result: 'unknown',
      certainty: 'unknown',
      message: 'Electrical item in a wet room without an assigned bathroom zone — the IP rating cannot be checked.',
      productIds: [product.id],
    });
  }
  if (context.pairedProducts) checks.push(...checkPairings(product, context.pairedProducts));

  const missingInformation = [
    ...checkProductCompleteness(product).missing.map((field) => `${field.label} (${humanize(field.certainty)})`),
    ...checks.filter((c) => c.result === 'unknown' && c.id !== 'information').map((c) => c.message),
  ];

  return {
    productId: product.id,
    outcome: deriveOutcome(checks),
    certainty: combineCertainty(...checks.map((c) => c.certainty)),
    checks,
    missingInformation: [...new Set(missingInformation)],
  };
}

function isClearanceKey(key: string): key is PlanningClearanceKey {
  return Object.hasOwn(planningGuidance.clearances, key);
}

function envelopeFromAllowance(allowance: FixtureAllowance): SpaceEnvelope {
  return {
    id: allowance.id,
    label: allowance.label,
    widthMm: allowance.widthMm,
    depthMm: allowance.depthMm,
    heightMm: allowance.heightMm,
  };
}

/** Assesses every product assigned to a room, using the room's allowances, services, lighting zones and pairings. */
export function assessRoomProducts(room: Room, products: readonly Product[]): Record<string, CompatibilityReport> {
  const inRoom = products.filter((product) => room.productIds.includes(product.id));
  const reports: Record<string, CompatibilityReport> = {};
  for (const product of inRoom) {
    const [allowance, ...additionalAllowances] = room.fixtureAllowances.filter((a) => a.productId === product.id);
    const zones = (room.lighting?.fixtures ?? []).flatMap((f) => (f.productId === product.id && f.bathroomZone ? [f.bathroomZone] : []));
    const electrical = product.installation.electrical.value;
    const context: ProductContext = { room, pairedProducts: inRoom };
    if (additionalAllowances.length > 0) context.additionalAllowances = additionalAllowances;
    if (allowance) {
      context.envelope = envelopeFromAllowance(allowance);
      const clearance = allowance.frontClearance;
      if (clearance && isClearanceKey(clearance.guidance)) {
        context.clearances = [{ key: clearance.guidance, availableMm: clearance.availableMm }];
      }
    }
    if (zones.length > 0) {
      context.bathroomZones = [...new Set(zones)].map((zone) => ({ zone, certainty: 'requires-verification' as const }));
    } else if (WET_ROOM_TYPES.includes(room.type) && electrical !== 'none') {
      context.zoneUnassigned = true;
    }
    reports[product.id] = assessProduct(product, context);
  }
  return reports;
}
