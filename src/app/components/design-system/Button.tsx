import { forwardRef, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  pixel?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, pixel = false, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={clsx(
          'inline-flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
          {
            // Variants
            'bg-primary text-primary-foreground hover:brightness-110 focus:ring-primary shadow-[0_0_16px_rgba(255,214,10,0.2)] hover:shadow-[0_0_24px_rgba(255,214,10,0.35)]': variant === 'primary',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-muted-foreground': variant === 'secondary',
            'border border-border bg-transparent text-foreground hover:bg-secondary hover:border-primary/30 focus:ring-primary': variant === 'outline',
            'bg-transparent text-foreground hover:bg-secondary focus:ring-muted-foreground': variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:brightness-110 focus:ring-destructive': variant === 'danger',
            'bg-accent text-accent-foreground hover:brightness-110 focus:ring-accent shadow-[0_0_16px_rgba(0,212,255,0.2)]': variant === 'accent',

            // Sizes
            'px-3 py-1.5 text-sm gap-1.5': size === 'sm',
            'px-5 py-2.5 text-base gap-2': size === 'md',
            'px-7 py-3.5 text-lg gap-2.5': size === 'lg',

            'w-full': fullWidth,
            'font-[family-name:var(--font-display)] text-xs tracking-wider uppercase': pixel,
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
