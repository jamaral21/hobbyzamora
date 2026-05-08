import { clsx } from 'clsx';
import { formatJPY, formatCLP } from '../../data/shipmentsDomain';

interface PriceDisplayProps {
  amount: number;
  currency: 'JPY' | 'CLP';
  className?: string;
}

export function PriceDisplay({ amount, currency, className }: PriceDisplayProps) {
  const formatted = currency === 'JPY' ? formatJPY(amount) : formatCLP(amount);
  return (
    <span className={clsx('font-[family-name:var(--font-mono)] text-primary', className)}>
      {formatted}
    </span>
  );
}
