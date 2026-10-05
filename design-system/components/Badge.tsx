import type { ComponentPropsWithoutRef } from 'react';
import type { StatusTone } from '../utils/status';
import { cx } from './cx';

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  tone?: StatusTone;
  size?: 'sm' | 'md';
  /** Leading dot — reinforces tone without relying on colour alone. */
  dot?: boolean;
  /** Dashed outline, used for missing or unknown information. */
  dashed?: boolean;
}

/** Compact label for categories, tags and states. Always carries text; colour is never the only signal. */
export function Badge({ tone = 'neutral', size = 'md', dot = false, dashed = false, className, children, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={cx('cd-badge', `cd-badge--${tone}`, `cd-badge--${size}`, dashed && 'cd-badge--dashed', className)}
    >
      {dot ? <span className="cd-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
