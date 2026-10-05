import type { ReactNode } from 'react';
import { cx } from './cx';

export interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Unit announced with the label, e.g. "mm". */
  unit?: string;
  className?: string;
  children: ReactNode;
}

export const hintId = (id: string) => `${id}-hint`;
export const errorId = (id: string) => `${id}-error`;

/** `aria-describedby` value linking a control to its hint and error. */
export function describedBy(id: string, hint: unknown, error: unknown): string | undefined {
  const ids = [hint ? hintId(id) : null, error ? errorId(id) : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

/** Shared label / hint / error frame for form controls. */
export function Field({ id, label, hint, error, required = false, unit, className, children }: FieldProps) {
  return (
    <div className={cx('cd-field', Boolean(error) && 'cd-field--invalid', className)}>
      <label className="cd-field__label" htmlFor={id}>
        {label}
        {unit ? <span className="cd-visually-hidden"> ({unit})</span> : null}
        {required ? <span className="cd-field__required"> (required)</span> : null}
      </label>
      {hint ? (
        <p id={hintId(id)} className="cd-field__hint">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId(id)} className="cd-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
