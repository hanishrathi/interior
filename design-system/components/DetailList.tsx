import type { ReactNode } from 'react';
import { cx } from './cx';

export interface DetailItem {
  term: ReactNode;
  detail: ReactNode;
}

/** Term / detail pairs as a semantic description list. Stacks on narrow containers. */
export function DetailList({ items, className }: { items: readonly DetailItem[]; className?: string }) {
  return (
    <dl className={cx('cd-dl', className)}>
      {items.map((item, index) => (
        <div key={index} className="cd-dl__row">
          <dt className="cd-dl__term">{item.term}</dt>
          <dd className="cd-dl__detail">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
