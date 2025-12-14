import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../utils/cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  active?: boolean;
  children?: ReactNode;
};

export function Button({
  variant = 'secondary',
  size = 'md',
  active,
  className,
  type,
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium transition-all border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
  const sizes: Record<ButtonSize, string> = {
    md: 'px-3 py-2 text-sm',
    sm: 'px-2.5 py-1.5 text-xs',
  };
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90 focus-visible:ring-primary/40',
    secondary:
      'bg-surface text-neutral-900 border-border shadow-sm hover:border-primary hover:text-primary focus-visible:ring-primary/30',
    ghost:
      'bg-transparent text-neutral-700 border-transparent hover:bg-surface-muted focus-visible:ring-primary/20',
    danger: 'bg-danger text-white border-danger shadow-sm hover:bg-danger/90 focus-visible:ring-danger/40',
  };
  const isActive = Boolean(active);
  const hasActive = active !== undefined;
  const activeCls =
    isActive && (variant === 'secondary' || variant === 'ghost')
      ? 'bg-primary text-primary-foreground border-primary'
      : '';

  return (
    <button
      className={cx(base, sizes[size], variants[variant], activeCls, className)}
      type={type ?? 'button'}
      aria-pressed={hasActive ? isActive : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
