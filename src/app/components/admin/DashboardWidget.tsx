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
  variant?: 'default' | 'purple' | 'blue' | 'green' | 'orange';
}

export function DashboardWidget({ title, value, icon: Icon, trend, variant = 'default' }: DashboardWidgetProps) {
  const trendColor = trend && trend.value > 0 ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
            <p className="text-2xl text-gray-900 dark:text-gray-100">{value}</p>
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
                'bg-gray-100 dark:bg-gray-800': variant === 'default',
                'bg-purple-100 dark:bg-purple-900/30': variant === 'purple',
                'bg-blue-100 dark:bg-blue-900/30': variant === 'blue',
                'bg-green-100 dark:bg-green-900/30': variant === 'green',
                'bg-orange-100 dark:bg-orange-900/30': variant === 'orange',
              }
            )}
          >
            <Icon
              className={clsx(
                'w-6 h-6',
                {
                  'text-gray-600 dark:text-gray-400': variant === 'default',
                  'text-purple-600 dark:text-purple-400': variant === 'purple',
                  'text-blue-600 dark:text-blue-400': variant === 'blue',
                  'text-green-600 dark:text-green-400': variant === 'green',
                  'text-orange-600 dark:text-orange-400': variant === 'orange',
                }
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
