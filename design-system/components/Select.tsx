import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from './cx';
import { Field, describedBy } from './Field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<ComponentPropsWithRef<'select'>, 'children'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  options: readonly SelectOption[];
  /** Empty first option, e.g. "Choose a finish". Not selectable when the field is required. */
  placeholder?: string;
}

export function Select({ label, hint, error, options, placeholder, id, required, className, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <Field id={selectId} label={label} hint={hint} error={error} required={Boolean(required)}>
      <select
        {...rest}
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(selectId, hint, error)}
        className={cx('cd-control', 'cd-select', className)}
      >
        {placeholder ? (
          <option value="" disabled={required}>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
