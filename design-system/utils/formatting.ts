import type { Budget, DimensionsMm, SpecValue } from '../schemas/common';
import { describeStatus } from './status';

/** Indian English: lakh/crore digit grouping, day-month-year dates. */
export const LOCALE = 'en-IN';

const numberFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** `1650` → `1,650 mm`. */
export function formatMm(value: number): string {
  return `${formatNumber(value)} mm`;
}

/** Area in square metres from two millimetre lengths. */
export function areaM2FromMm(lengthMm: number, widthMm: number): number {
  return (lengthMm * widthMm) / 1_000_000;
}

/** `3.96` → `3.96 m²`. */
export function formatAreaM2(value: number): string {
  return `${value.toFixed(2)} m²`;
}

export function formatBar(value: number): string {
  return `${formatNumber(value)} bar`;
}

export function formatKelvin(value: number): string {
  return `${value} K`;
}

export function formatLuxRange(minLux: number, maxLux: number): string {
  return minLux === maxLux ? `${formatNumber(minLux)} lx` : `${formatNumber(minLux)}–${formatNumber(maxLux)} lx`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

const inrFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** `3500000` → `₹35,00,000`. */
export function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

const trimDecimals = (value: number): string => formatNumber(Number(value.toFixed(2)));

/** `3500000` → `₹35 lakh`; `12500000` → `₹1.25 crore`; smaller amounts in full. */
export function formatINRCompact(amount: number): string {
  if (amount >= 10_000_000) return `₹${trimDecimals(amount / 10_000_000)} crore`;
  if (amount >= 100_000) return `₹${trimDecimals(amount / 100_000)} lakh`;
  return formatINR(amount);
}

export function formatMoney(amount: number, currency: string): string {
  if (currency === 'INR') return formatINR(amount);
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

/** Budget range as text, e.g. `₹35 lakh – ₹45 lakh`, or `Unknown`. */
export function formatBudgetRange(budget: Budget): string {
  const range = budget.range.value;
  if (!range) return describeStatus('certainty', budget.range.certainty).label;
  const format = budget.currency === 'INR' ? formatINRCompact : (n: number) => formatMoney(n, budget.currency);
  return range.minimum === range.maximum ? format(range.minimum) : `${format(range.minimum)} – ${format(range.maximum)}`;
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** `2026-08-12` → `12 Aug 2026`. Parsed as UTC so the calendar date never shifts. */
export function formatDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? isoDate : dateFormatter.format(parsed);
}

/**
 * Text for a spec value. Known values are formatted; missing values read as their certainty
 * label ("Unknown", "Requires verification") so gaps are never rendered as blanks.
 */
export function formatSpecValue<T>(spec: SpecValue<T>, format: (value: T) => string = String): string {
  return spec.value === null ? describeStatus('certainty', spec.certainty).label : format(spec.value);
}

/** `W 900 × D 500 × H 450 mm`; unknown dimensions read `W unknown`. */
export function formatDimensions(dimensions: DimensionsMm): string {
  const part = (prefix: string, spec: SpecValue<number>) =>
    `${prefix} ${spec.value === null ? 'unknown' : formatNumber(spec.value)}`;
  return `${part('W', dimensions.widthMm)} × ${part('D', dimensions.depthMm)} × ${part('H', dimensions.heightMm)} mm`;
}

const LABEL_OVERRIDES: Record<string, string> = {
  wc: 'WC',
  'wc-floor-outlet': 'WC floor outlet',
  'wc-wall-outlet': 'WC wall outlet',
  'socket-6a': '6 A socket',
  'socket-16a': '16 A socket',
  'low-voltage-driver': 'Low-voltage driver',
  m2: 'm²',
  'zone-0': 'Zone 0',
  'zone-1': 'Zone 1',
  'zone-2': 'Zone 2',
};

/** Turns a vocabulary value into a sentence-case label: `requires-verification` → `Requires verification`. */
export function humanize(value: string): string {
  const override = LABEL_OVERRIDES[value];
  if (override) return override;
  const words = value.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const AGE_GROUP_LABELS: Record<string, [string, string]> = {
  adult: ['adult', 'adults'],
  senior: ['senior', 'seniors'],
  teen: ['teenager', 'teenagers'],
  child: ['child', 'children'],
};

/** `4 members: 2 adults, 1 senior, 1 child`. */
export function formatHousehold(members: readonly { ageGroup: string }[]): string {
  const counts = new Map<string, number>();
  for (const member of members) counts.set(member.ageGroup, (counts.get(member.ageGroup) ?? 0) + 1);
  const parts = Object.entries(AGE_GROUP_LABELS).flatMap(([group, [singular, plural]]) => {
    const count = counts.get(group);
    return count ? [pluralize(count, singular, plural)] : [];
  });
  return `${pluralize(members.length, 'member')}: ${parts.join(', ')}`;
}
