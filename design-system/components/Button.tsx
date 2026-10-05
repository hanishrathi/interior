import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Blocks activation and announces `loadingText` while an action completes. */
  loading?: boolean;
  loadingText?: string;
  /** Decorative icon before the label. Hidden from assistive technology. */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

/** Native button. Defaults to `type="button"` so it never submits a form by accident. */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  loadingText = 'Working…',
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  type = 'button',
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx('cd-button', `cd-button--${variant}`, `cd-button--${size}`, fullWidth && 'cd-button--full', className)}
    >
      {leadingIcon ? (
        <span className="cd-button__icon" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      <span className="cd-button__label">{loading ? loadingText : children}</span>
      {trailingIcon ? (
        <span className="cd-button__icon" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </button>
  );
}
