import { Badge, type BadgeProps } from '../design-system/Badge';

const statusMap: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  por_pagar: { label: 'Por Pagar', variant: 'warning' },
  esp_pago: { label: 'Esp. Pago', variant: 'info' },
  pagado: { label: 'Pagado', variant: 'success' },
  sin_pagar: { label: 'Sin Pagar', variant: 'danger' },
  transito: { label: '✈️ En Tránsito', variant: 'info' },
  llegada: { label: '📦 Llegada', variant: 'warning' },
  costeada: { label: '✅ Costeada', variant: 'success' },
  pendiente: { label: 'Pendiente', variant: 'warning' },
  costeado: { label: 'Costeado', variant: 'success' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusMap[status] || { label: status, variant: 'default' as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
