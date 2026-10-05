import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from './cx';
import { Field, describedBy } from './Field';

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  /** Visible label. Required — placeholders are not labels. */
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Metric unit shown inside the field and announced with the label, e.g. "mm" or "m²". */
  unit?: string;
}

export function Input({ label, hint, error, unit, id, required, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const field = { id: inputId, label, hint, error, unit };
  return (
    <Field {...field} required={Boolean(required)}>
      <div className="cd-input-group">
        <input
          {...rest}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, hint, error)}
          className={cx('cd-control', 'cd-input', unit && 'cd-input--with-unit', className)}
        />
        {unit ? (
          <span className="cd-input__unit" aria-hidden="true">
            {unit}
          </span>
        ) : null}
      </div>
    </Field>
  );
}
