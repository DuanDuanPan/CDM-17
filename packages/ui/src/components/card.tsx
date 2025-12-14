import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
  children?: ReactNode;
};

export function Card({ padded = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx('rounded-2xl bg-surface border border-border shadow-lg', padded && 'p-4', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
