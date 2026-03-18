import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'presale';
  size?: 'sm' | 'md';
  pixel?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'sm', pixel = false, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-md font-medium',
          {
            'bg-secondary text-muted-foreground': variant === 'default',
            'bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/20': variant === 'success',
            'bg-[#ffab00]/15 text-[#ffab00] border border-[#ffab00]/20': variant === 'warning',
            'bg-destructive/15 text-destructive border border-destructive/20': variant === 'danger',
            'bg-accent/15 text-accent border border-accent/20': variant === 'info',
            'bg-primary/15 text-primary border border-primary/20': variant === 'brand',
            'bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/30 shadow-[0_0_8px_rgba(255,214,10,0.15)]': variant === 'presale',

            'px-2 py-0.5 text-xs': size === 'sm',
            'px-3 py-1 text-sm': size === 'md',

            'font-[family-name:var(--font-display)] text-[0.5rem] tracking-wider uppercase': pixel,
          },
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
