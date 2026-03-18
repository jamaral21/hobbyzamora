import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg text-foreground placeholder:text-muted-foreground',
            'bg-input-background border transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background',
            error
              ? 'border-destructive/50 focus:ring-destructive/40'
              : 'border-border focus:border-primary/40 focus:ring-primary/30',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg text-foreground',
            'bg-input-background border transition-all duration-200 appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background',
            error
              ? 'border-destructive/50 focus:ring-destructive/40'
              : 'border-border focus:border-primary/40 focus:ring-primary/30',
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            'w-full px-4 py-2.5 rounded-lg text-foreground placeholder:text-muted-foreground',
            'bg-input-background border transition-all duration-200 resize-vertical min-h-[80px]',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background',
            error
              ? 'border-destructive/50 focus:ring-destructive/40'
              : 'border-border focus:border-primary/40 focus:ring-primary/30',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
