import { forwardRef } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cx } from '../utils/cx';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  children?: ReactNode;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, className, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      className={cx(
        'rounded-lg border bg-surface px-3 py-2 text-sm text-neutral-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-neutral-700',
        invalid
          ? 'border-warning focus-visible:ring-warning/30'
          : 'border-border focus-visible:ring-primary/30',
        className
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';
