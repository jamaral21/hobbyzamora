import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../design-system/Card';
import { clsx } from 'clsx';

export interface DashboardWidgetProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning';
}

export function DashboardWidget({ title, value, icon: Icon, trend, variant = 'default' }: DashboardWidgetProps) {
  const trendColor = trend && trend.value > 0 ? 'text-[#00e676]' : 'text-destructive';

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl text-foreground">{value}</p>
            {trend && (
              <p className={clsx('text-xs mt-2', trendColor)}>
                {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div
            className={clsx(
              'w-12 h-12 rounded-lg flex items-center justify-center',
              {
                'bg-secondary': variant === 'default',
                'bg-primary/10': variant === 'primary',
                'bg-accent/10': variant === 'accent',
                'bg-[#00e676]/10': variant === 'success',
                'bg-[#ffab00]/10': variant === 'warning',
              }
            )}
          >
            <Icon
              className={clsx(
                'w-6 h-6',
                {
                  'text-muted-foreground': variant === 'default',
                  'text-primary': variant === 'primary',
                  'text-accent': variant === 'accent',
                  'text-[#00e676]': variant === 'success',
                  'text-[#ffab00]': variant === 'warning',
                }
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
