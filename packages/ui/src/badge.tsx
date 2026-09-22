import type { HTMLAttributes } from 'react';
import { cx } from './utils';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx('mh-badge', className)} {...props} />;
}
