import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  children?: ReactNode;
};

export function Badge({ tone = 'neutral', children, className, ...rest }: BadgeProps) {
  const toneMap: Record<BadgeTone, string> = {
    neutral: 'bg-surface-muted text-neutral-700 border-border',
    info: 'bg-info/10 text-info border-info/30',
    success: 'bg-success/10 text-success border-success/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    danger: 'bg-danger/10 text-danger border-danger/30',
  };

  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border shadow-sm',
        toneMap[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
