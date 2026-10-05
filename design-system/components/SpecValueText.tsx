import type { SpecValue } from '../schemas/common';
import { formatSpecValue } from '../utils/formatting';
import { cx } from './cx';
import { StatusBadge } from './StatusBadge';

export interface SpecValueTextProps<T> {
  spec: SpecValue<T>;
  format?: (value: T) => string;
  /** Hide the badge for confirmed values to reduce noise in dense layouts. Default true. */
  quietConfirmed?: boolean;
  className?: string;
}

/**
 * A value with its certainty. Missing values render as their certainty badge ("Unknown",
 * "Requires verification") — never as a blank or a dash. Source and note appear on hover.
 */
export function SpecValueText<T>({ spec, format, quietConfirmed = true, className }: SpecValueTextProps<T>) {
  if (spec.value === null) {
    return <StatusBadge kind="certainty" value={spec.certainty} size="sm" className={className} />;
  }
  const detail = [spec.source ? `Source: ${spec.source}` : null, spec.note ? `Note: ${spec.note}` : null]
    .filter(Boolean)
    .join(' · ');
  const showBadge = !(quietConfirmed && spec.certainty === 'confirmed');
  return (
    <span className={cx('cd-spec', className)} title={detail || undefined}>
      <span className="cd-spec__value">{formatSpecValue(spec, format)}</span>
      {showBadge ? <StatusBadge kind="certainty" value={spec.certainty} size="sm" /> : null}
    </span>
  );
}
