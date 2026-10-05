import type { ReactNode } from 'react';
import { cx } from './cx';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Primary next step, e.g. a button to add the first product. */
  action?: ReactNode;
  /** Decorative illustration or icon; hidden from assistive technology. */
  icon?: ReactNode;
  className?: string;
}

/** Explains why a region is empty and what to do next. */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cx('cd-empty-state', className)}>
      {icon ? (
        <div className="cd-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <p className="cd-empty-state__title">{title}</p>
      {description ? <p className="cd-empty-state__description">{description}</p> : null}
      {action ? <div className="cd-empty-state__action">{action}</div> : null}
    </div>
  );
}
