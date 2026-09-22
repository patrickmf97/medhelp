import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from './utils';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
};

export function Field({ id, label, error, hint, className, ...props }: FieldProps) {
  const inputId = id ?? props.name;
  const descriptionId = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <label className="mh-field" htmlFor={inputId}>
      <span className="mh-field__label">{label}</span>
      <input aria-describedby={descriptionId} aria-invalid={Boolean(error)} className={cx('mh-field__input', className)} id={inputId} {...props} />
      {error ? <span className="mh-field__error" id={descriptionId} role="alert">{error}</span> : null}
      {!error && hint ? <span className="mh-field__hint" id={descriptionId}>{hint}</span> : null}
    </label>
  );
}
