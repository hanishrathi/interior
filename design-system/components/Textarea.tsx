import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from './cx';
import { Field, describedBy } from './Field';

export interface TextareaProps extends ComponentPropsWithRef<'textarea'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export function Textarea({ label, hint, error, id, required, rows = 4, className, ...rest }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  return (
    <Field id={textareaId} label={label} hint={hint} error={error} required={Boolean(required)}>
      <textarea
        {...rest}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(textareaId, hint, error)}
        className={cx('cd-control', 'cd-textarea', className)}
      />
    </Field>
  );
}
