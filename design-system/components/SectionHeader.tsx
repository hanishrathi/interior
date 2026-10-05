import type { ReactNode } from 'react';
import { cx } from './cx';

const HEADINGS = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' } as const;

export interface SectionHeaderProps {
  title: ReactNode;
  /** Heading level — choose it to fit the page outline, not for visual size. */
  level?: keyof typeof HEADINGS;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
  className?: string;
}

export function SectionHeader({ title, level = 2, eyebrow, description, actions, id, className }: SectionHeaderProps) {
  const Heading = HEADINGS[level];
  return (
    <div className={cx('cd-section-header', `cd-section-header--h${level}`, className)}>
      <div className="cd-section-header__text">
        {eyebrow ? <p className="cd-eyebrow">{eyebrow}</p> : null}
        <Heading id={id} className="cd-section-header__title">
          {title}
        </Heading>
        {description ? <p className="cd-section-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="cd-section-header__actions">{actions}</div> : null}
    </div>
  );
}
