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

const variantStyles: Record<string, { text: string; iconBg: string }> = {
  default: { text: 'text-foreground', iconBg: 'bg-blue-50 text-blue-600' },
  warning: { text: 'text-foreground', iconBg: 'bg-amber-50 text-amber-600' },
  success: { text: 'text-foreground', iconBg: 'bg-emerald-50 text-emerald-600' },
  danger: { text: 'text-foreground', iconBg: 'bg-red-50 text-red-600' },
};

export function KPICard({ title, value, icon: Icon, trend, variant = 'default' }: KPICardProps) {
  const styles = variantStyles[variant];
  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className={clsx('text-3xl font-bold font-[family-name:var(--font-mono)]', styles.text)}>
            {value}
          </p>
          {trend && (
            <p className={clsx('text-xs', trend.value >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={clsx('p-2.5 rounded-lg', styles.iconBg)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}
