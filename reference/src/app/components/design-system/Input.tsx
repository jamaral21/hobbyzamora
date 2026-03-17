import { forwardRef, InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, className, ...props }, ref) => {
    return (
      <div className={clsx('flex flex-col gap-1.5', { 'w-full': fullWidth })}>
        {label && (
          <label className="text-sm text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'px-3 py-2 rounded-lg border bg-white dark:bg-gray-900',
            'text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600',
            'border-gray-300 dark:border-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200',
            {
              'border-red-500 focus:ring-red-500': error,
            },
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, InputHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            'px-3 py-2 rounded-lg border bg-white dark:bg-gray-900',
            'text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600',
            'border-gray-300 dark:border-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200 resize-y',
            {
              'border-red-500 focus:ring-red-500': error,
            },
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, InputHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; children: React.ReactNode }>(
  ({ label, error, className, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'px-3 py-2 rounded-lg border bg-white dark:bg-gray-900',
            'text-gray-900 dark:text-gray-100',
            'border-gray-300 dark:border-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200',
            {
              'border-red-500 focus:ring-red-500': error,
            },
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && (
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
