import type { DimensionsMm } from '../schemas/common';
import { formatDimensions } from '../utils/formatting';
import { combineCertainty } from '../utils/status';
import { cx } from './cx';
import { StatusBadge } from './StatusBadge';

export interface DimensionsTextProps {
  dimensions: DimensionsMm;
  className?: string;
}

/**
 * W × D × H in millimetres with the weakest certainty of the three. When nothing is known it
 * renders a single certainty badge instead of a row of "unknown"s.
 */
export function DimensionsText({ dimensions, className }: DimensionsTextProps) {
  const specs = [dimensions.widthMm, dimensions.depthMm, dimensions.heightMm];
  const certainty = combineCertainty(...specs.map((spec) => spec.certainty));
  if (specs.every((spec) => spec.value === null)) {
    return <StatusBadge kind="certainty" value={certainty} size="sm" className={className} />;
  }
  return (
    <span className={cx('cd-spec', className)}>
      <span className="cd-spec__value cd-mono">{formatDimensions(dimensions)}</span>
      {certainty !== 'confirmed' ? <StatusBadge kind="certainty" value={certainty} size="sm" /> : null}
    </span>
  );
}
