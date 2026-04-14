import { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Loader2, Calendar, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { DashboardWidget } from '../../components/admin/DashboardWidget';
import { SalesChart } from '../../components/admin/SalesChart';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { useDashboardStats, useSalesChart, useOrders } from '../../hooks/useData';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type { Order, OrderItem } from '../../lib/api';

type DatePreset = 'today' | 'week' | 'month' | 'custom';

function getDateRange(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  switch (preset) {
    case 'today':
      return { start: end, end };
    case 'week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { start: d.toISOString().split('T')[0], end };
    }
    case 'month': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return { start: d.toISOString().split('T')[0], end };
    }
    default:
      return { start: end, end };
  }
}

function formatCLP(value: number): string {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 });
}

const SOURCE_LABELS: Record<string, string> = {
  ONLINE: 'Online',
  POS: 'POS',
  INSTAGRAM: 'Instagram',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

export default function DashboardPage() {
  const { isAuthenticated } = useAdminAuth();
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const range = datePreset === 'custom'
    ? { start: customStart, end: customEnd }
    : getDateRange(datePreset);

  const { data: stats, isLoading: statsLoading } = useDashboardStats(range.start, range.end, { enabled: isAuthenticated });
  const { data: chartData, isLoading: chartLoading } = useSalesChart(
    datePreset === 'today' ? 1 : datePreset === 'week' ? 7 : 30,
    { enabled: isAuthenticated }
  );
  const { data: ordersData, isLoading: ordersLoading } = useOrders(
    { startDate: range.start, endDate: range.end, limit: 100 },
    { enabled: isAuthenticated }
  );

  const allOrders = ordersData?.orders || [];

  // Derive KPIs from orders (client-side fallback until backend supports new fields)
  const kpis = useMemo(() => {
    if (stats?.totalSales !== undefined) {
      return {
        sales: stats.totalSales,
        cost: stats.totalCost ?? 0,
        margin: stats.totalMargin ?? 0,
        marginPct: stats.marginPercent ?? 0,
        count: stats.orderCount ?? allOrders.length,
      };
    }
    // Fallback: calculate from orders client-side
    const validOrders = allOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    const sales = validOrders.reduce((s, o) => s + o.total, 0);
    const cost = validOrders.reduce((s, o) =>
      s + (o.items || []).reduce((ic, item) => ic + (item.cost || 0) * item.quantity, 0), 0
    );
    const margin = sales - cost;
    return {
      sales,
      cost,
      margin,
      marginPct: sales > 0 ? (margin / sales) * 100 : 0,
      count: validOrders.length,
    };
  }, [stats, allOrders]);

  // SKU summary table
  const skuSummary = useMemo(() => {
    const validOrders = allOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    const map = new Map<string, { sku: string; name: string; qty: number; revenue: number; cost: number }>();
    for (const order of validOrders) {
      for (const item of order.items || []) {
        const key = item.sku || item.productId;
        const existing = map.get(key);
        if (existing) {
          existing.qty += item.quantity;
          existing.revenue += item.price * item.quantity;
          existing.cost += (item.cost || 0) * item.quantity;
        } else {
          map.set(key, {
            sku: item.sku || '—',
            name: item.name,
            qty: item.quantity,
            revenue: item.price * item.quantity,
            cost: (item.cost || 0) * item.quantity,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [allOrders]);

  if (statsLoading || chartLoading || ordersLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header + Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl text-foreground mb-1">Panel de Ventas</h1>
          <p className="text-muted-foreground text-sm">
            {kpis.count} {kpis.count === 1 ? 'venta' : 'ventas'} en el período seleccionado
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            {(['today', 'week', 'month'] as DatePreset[]).map((p) => (
              <button
                key={p}
                onClick={() => setDatePreset(p)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  datePreset === p
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p === 'today' ? 'Hoy' : p === 'week' ? '7 días' : '30 días'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setDatePreset('custom')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              datePreset === 'custom'
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Rango
          </button>
        </div>
      </div>

      {datePreset === 'custom' && (
        <div className="flex items-center gap-3 mb-6 p-3 bg-secondary rounded-lg">
          <label className="text-xs text-muted-foreground">Desde</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
          />
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground"
          />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DashboardWidget
          title="Ventas"
          value={formatCLP(kpis.sales)}
          icon={DollarSign}
          variant="primary"
          trend={{ value: kpis.count, label: 'órdenes' }}
        />
        <DashboardWidget
          title="Costos"
          value={formatCLP(kpis.cost)}
          icon={Receipt}
          variant="warning"
        />
        <DashboardWidget
          title="Margen"
          value={formatCLP(kpis.margin)}
          icon={TrendingUp}
          variant="success"
          trend={{ value: Math.round(kpis.marginPct * 10) / 10, label: 'margen %' }}
        />
      </div>

      {/* Chart */}
      <div className="mb-8">
        <SalesChart data={chartData || []} />
      </div>

      {/* SKU Summary */}
      {skuSummary.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Resumen por SKU</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-normal">SKU</th>
                    <th className="text-left py-2 text-muted-foreground font-normal">Producto</th>
                    <th className="text-right py-2 text-muted-foreground font-normal">Uds.</th>
                    <th className="text-right py-2 text-muted-foreground font-normal">Venta</th>
                    <th className="text-right py-2 text-muted-foreground font-normal">Costo</th>
                    <th className="text-right py-2 text-muted-foreground font-normal">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {skuSummary.map((row) => (
                    <tr key={row.sku} className="border-b border-border/50 hover:bg-secondary/50">
                      <td className="py-2.5 text-foreground font-mono text-xs">{row.sku}</td>
                      <td className="py-2.5 text-foreground truncate max-w-[200px]">{row.name}</td>
                      <td className="py-2.5 text-right text-foreground">{row.qty}</td>
                      <td className="py-2.5 text-right text-foreground">{formatCLP(row.revenue)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{formatCLP(row.cost)}</td>
                      <td className="py-2.5 text-right text-[#00e676]">{formatCLP(row.revenue - row.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          {allOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay ventas en este período</p>
          ) : (
            <div className="space-y-2">
              {allOrders.map((order) => {
                const isExpanded = expandedOrder === order.id;
                const itemCost = (order.items || []).reduce((s, i) => s + (i.cost || 0) * i.quantity, 0);
                const orderMargin = order.total - itemCost;
                return (
                  <div key={order.id} className="border border-border/50 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm text-foreground font-mono">{order.orderNumber}</span>
                            <Badge
                              variant={
                                order.status === 'DELIVERED' ? 'success'
                                : order.status === 'CANCELLED' || order.status === 'REFUNDED' ? 'destructive'
                                : order.status === 'SHIPPED' ? 'info'
                                : order.status === 'PROCESSING' ? 'warning'
                                : 'default'
                              }
                              size="sm"
                            >
                              {STATUS_LABELS[order.status] || order.status}
                            </Badge>
                            <Badge variant="default" size="sm">
                              {SOURCE_LABELS[order.source] || order.source}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {order.customerName} • {new Date(order.createdAt).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-foreground">{formatCLP(order.total)}</p>
                          {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
                            <p className="text-xs text-[#00e676]">+{formatCLP(orderMargin)}</p>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border/50 bg-secondary/30 p-4">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="text-left pb-2 font-normal">SKU</th>
                              <th className="text-left pb-2 font-normal">Producto</th>
                              <th className="text-right pb-2 font-normal">Cant.</th>
                              <th className="text-right pb-2 font-normal">Precio</th>
                              <th className="text-right pb-2 font-normal">Costo</th>
                              <th className="text-right pb-2 font-normal">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(order.items || []).map((item, idx) => (
                              <tr key={idx} className="border-t border-border/30">
                                <td className="py-1.5 text-foreground font-mono">{item.sku || '—'}</td>
                                <td className="py-1.5 text-foreground truncate max-w-[180px]">{item.name}</td>
                                <td className="py-1.5 text-right text-foreground">{item.quantity}</td>
                                <td className="py-1.5 text-right text-foreground">{formatCLP(item.price)}</td>
                                <td className="py-1.5 text-right text-muted-foreground">{formatCLP(item.cost || 0)}</td>
                                <td className="py-1.5 text-right text-foreground">{formatCLP(item.price * item.quantity)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {order.customerEmail && (
                          <p className="text-xs text-muted-foreground mt-3">
                            📧 {order.customerEmail}
                            {order.customerPhone && ` • 📱 ${order.customerPhone}`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
