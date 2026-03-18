import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  glow?: 'none' | 'primary' | 'accent';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', hover = false, glow = 'none', className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'bg-card rounded-xl border border-border',
          'transition-all duration-300',
          {
            'p-0': padding === 'none',
            'p-3': padding === 'sm',
            'p-6': padding === 'md',
            'p-8': padding === 'lg',
            'hover:border-primary/25 hover:shadow-[0_0_20px_rgba(255,214,10,0.08)]': hover,
            'shadow-[0_0_20px_rgba(255,214,10,0.1)] border-primary/20': glow === 'primary',
            'shadow-[0_0_20px_rgba(0,212,255,0.1)] border-accent/20': glow === 'accent',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={clsx('mb-4', className)} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3 ref={ref} className={clsx('text-foreground', className)} {...props}>
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={clsx(className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';
