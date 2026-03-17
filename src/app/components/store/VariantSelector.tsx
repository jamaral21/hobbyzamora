import { useState } from 'react';
import { clsx } from 'clsx';
import { ProductVariant } from '../../data/mockData';

export interface VariantSelectorProps {
  variants: ProductVariant[];
  onSelect: (variantId: string, option: string) => void;
}

export function VariantSelector({ variants, onSelect }: VariantSelectorProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const handleSelect = (variantId: string, option: string) => {
    setSelections(prev => ({ ...prev, [variantId]: option }));
    onSelect(variantId, option);
  };

  return (
    <div className="space-y-4">
      {variants.map((variant) => (
        <div key={variant.id}>
          <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
            {variant.name}
          </label>
          <div className="flex flex-wrap gap-2">
            {variant.options.map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(variant.id, option)}
                className={clsx(
                  'px-4 py-2 rounded-lg border transition-all',
                  selections[variant.id] === option
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                    : 'border-gray-300 dark:border-gray-700 hover:border-purple-600'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
