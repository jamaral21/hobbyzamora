import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export function Dropdown({ trigger, children, align = 'left' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={clsx(
            'absolute top-full mt-2 py-2 bg-card',
            'border border-border rounded-xl shadow-lg',
            'min-w-[160px] z-50',
            {
              'left-0': align === 'left',
              'right-0': align === 'right',
            }
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full px-4 py-2 text-left text-sm transition-colors',
        danger
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-secondary'
      )}
    >
      {children}
    </button>
  );
}
