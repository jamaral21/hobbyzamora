import { HTMLAttributes, forwardRef, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div className="w-full overflow-auto">
        <table
          ref={ref}
          className={clsx('w-full border-collapse', className)}
          {...props}
        />
      </div>
    );
  }
);

Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={clsx('border-b border-gray-200 dark:border-gray-800', className)}
        {...props}
      />
    );
  }
);

TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    return <tbody ref={ref} className={clsx(className)} {...props} />;
  }
);

TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={clsx(
          'border-b border-gray-100 dark:border-gray-800 transition-colors',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          className
        )}
        {...props}
      />
    );
  }
);

TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={clsx(
          'px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300',
          className
        )}
        {...props}
      />
    );
  }
);

TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={clsx(
          'px-4 py-3 text-sm text-gray-900 dark:text-gray-100',
          className
        )}
        {...props}
      />
    );
  }
);

TableCell.displayName = 'TableCell';
