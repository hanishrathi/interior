import { describeStatus, type StatusKind, type StatusKinds } from '../utils/status';
import { Badge } from './Badge';

export interface StatusBadgeProps<K extends StatusKind> {
  /** Status vocabulary, e.g. `certainty`, `verification`, `approval`. */
  kind: K;
  value: StatusKinds[K];
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Renders any status from the shared registry (utils/status.ts) with a consistent label,
 * tone and description. Unknown information gets a dashed outline.
 */
export function StatusBadge<K extends StatusKind>({ kind, value, size = 'md', className }: StatusBadgeProps<K>) {
  const descriptor = describeStatus(kind, value);
  return (
    <Badge
      tone={descriptor.tone}
      dashed={Boolean(descriptor.dashed)}
      size={size}
      dot
      title={descriptor.description}
      className={className}
      data-status-kind={kind}
      data-status-value={value}
    >
      {descriptor.label}
    </Badge>
  );
}
