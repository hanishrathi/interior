import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cx } from './cx';

export type CardElement = 'article' | 'section' | 'div' | 'aside';
export type HeadingTag = 'h2' | 'h3' | 'h4';

export interface CardProps extends Omit<ComponentPropsWithoutRef<'article'>, 'title'> {
  as?: CardElement;
  /** Small uppercase label above the title (category, record type). */
  eyebrow?: ReactNode;
  title?: ReactNode;
  titleAs?: HeadingTag;
  /** Controls aligned with the title, e.g. a status badge or menu button. */
  actions?: ReactNode;
  footer?: ReactNode;
  variant?: 'outlined' | 'muted' | 'raised';
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({
  as: Element = 'article',
  eyebrow,
  title,
  titleAs: Title = 'h3',
  actions,
  footer,
  variant = 'outlined',
  padding = 'md',
  className,
  children,
  ...rest
}: CardProps) {
  const titleId = useId();
  const hasHeader = Boolean(eyebrow || title || actions);
  return (
    <Element
      {...rest}
      aria-labelledby={title ? titleId : rest['aria-labelledby']}
      className={cx('cd-card', `cd-card--${variant}`, `cd-card--pad-${padding}`, className)}
    >
      {hasHeader ? (
        <div className="cd-card__header">
          <div className="cd-card__heading">
            {eyebrow ? <p className="cd-eyebrow">{eyebrow}</p> : null}
            {title ? (
              <Title id={titleId} className="cd-card__title">
                {title}
              </Title>
            ) : null}
          </div>
          {actions ? <div className="cd-card__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="cd-card__body">{children}</div>
      {footer ? <div className="cd-card__footer">{footer}</div> : null}
    </Element>
  );
}
