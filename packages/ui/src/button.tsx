import type { ButtonHTMLAttributes } from 'react';
import { cx } from './utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function buttonClassName(variant: ButtonVariant = 'primary', className?: string) {
  return cx('mh-button', `mh-button--${variant}`, className);
}

export function Button({ className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const { variant = 'primary', ...buttonProps } = props;
  return <button className={buttonClassName(variant, className)} type={type} {...buttonProps} />;
}
