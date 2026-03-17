import { clsx } from 'clsx';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={clsx(
          'relative w-11 h-6 rounded-full transition-colors duration-200',
          {
            'bg-purple-600': checked && !disabled,
            'bg-gray-200 dark:bg-gray-700': !checked && !disabled,
            'opacity-50 cursor-not-allowed': disabled,
          }
        )}
        onClick={() => !disabled && onChange(!checked)}
      >
        <div
          className={clsx(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200',
            {
              'transform translate-x-5': checked,
            }
          )}
        />
      </div>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
}
