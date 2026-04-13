import { type LucideIcon } from 'lucide-react';
import { Card } from '../design-system/Card';
import { clsx } from 'clsx';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'warning' | 'success' | 'danger';
}

const variantStyles: Record<string, string> = {
  default: 'text-primary',
  warning: 'text-[#ffab00]',
  success: 'text-[#00e676]',
  danger: 'text-destructive',
};

export function KPICard({ title, value, icon: Icon, trend, variant = 'default' }: KPICardProps) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={clsx('text-2xl font-bold font-[family-name:var(--font-mono)]', variantStyles[variant])}>
            {value}
          </p>
          {trend && (
            <p className={clsx('text-xs', trend.value >= 0 ? 'text-[#00e676]' : 'text-destructive')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={clsx('p-2 rounded-lg bg-secondary', variantStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}
