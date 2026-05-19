import { useMemo, useState } from 'react';
import { DollarSign, TrendingUp, Loader2, Calendar, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { DashboardWidget } from '../../components/admin/DashboardWidget';
import { SalesChart } from '../../components/admin/SalesChart';
import { ProductFilterBar } from '../../components/admin/ProductFilterBar';
import { InventoryDiscrepancyPanel } from '../../components/admin/InventoryDiscrepancyPanel';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { useDashboardStats, useSalesChart, useOrders, useInventoryDiscrepancy } from '../../hooks/useData';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

type DatePreset = 'today' | 'week' | 'month' | 'custom';

function getDateRange(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { start: end, end };
    case 'week': {
      const date = new Date(now);
      date.setDate(date.getDate() - 7);
      return { start: date.toISOString().split('T')[0], end };
    }
    case 'month': {
      const date = new Date(now);
      date.setMonth(date.getMonth() - 1);
      return { start: date.toISOString().split('T')[0], end };
    }
    default:
      return { start: end, end };
  }
}

function formatCLP(value: number): string {
  return value.toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  });
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

function getPaymentLabel(method?: string): string {
  switch (method) {
    case 'CARD':
    case 'GETNET':
      return '💳 Tarjeta';
    case 'CASH':
      return '💵 Efectivo';
    case 'TRANSFER':
      return '🏦 Transferencia';
    default:
      return '—';
  }
}

function getShippingAddress(order: {
  shippingStreet?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingZip?: string | null;
  shippingCountry?: string | null;
}): string {
  const parts = [
    order.shippingStreet,
    order.shippingCity,
    order.shippingState,
    order.shippingZip,
    order.shippingCountry,
  ].filter((value) => typeof value === 'string' && value.trim().length > 0);

  return parts.length > 0 ? parts.join(', ') : '—';
}

export default function DashboardPage() {
  const { isAuthenticated } = useAdminAuth();
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const range = datePreset === 'custom'
    ? { start: customStart, end: customEnd }
    : getDateRange(datePreset);

  const productIdsParam = selectedProductIds.length > 0 ? selectedProductIds : undefined;

  const { data: stats, isLoading: statsLoading } = useDashboardStats(range.start, range.end, productIdsParam, {
    enabled: isAuthenticated,
  });
  const { data: chartData, isLoading: chartLoading } = useSalesChart(
    datePreset === 'today' ? 1 : datePreset === 'week' ? 7 : 30,
    productIdsParam,
    { enabled: isAuthenticated }
  );
  const { data: ordersData, isLoading: ordersLoading } = useOrders(
    { startDate: range.start, endDate: range.end, limit: 100, productIds: productIdsParam },
    { enabled: isAuthenticated }
  );
  const { data: inventoryData, error: inventoryError } = useInventoryDiscrepancy(selectedProductIds, {
    enabled: isAuthenticated && selectedProductIds.length > 0,
  });

  const allOrders = ordersData?.orders || [];

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

    const validOrders = allOrders.filter((order) => order.status !== 'CANCELLED' && order.status !== 'REFUNDED');
    const sales = validOrders.reduce((sum, order) => sum + order.total, 0);
    const cost = validOrders.reduce(
      (sum, order) => sum + (order.items || []).reduce((itemCost, item) => itemCost + (item.cost || 0) * item.quantity, 0),
      0
    );
    const margin = sales - cost;

    return {
      sales,
      cost,
      margin,
      marginPct: sales > 0 ? (margin / sales) * 100 : 0,
      count: validOrders.length,
    };
  }, [allOrders, stats]);

  const productSummary = useMemo(() => {
    const validOrders = allOrders.filter((order) => order.status !== 'CANCELLED' && order.status !== 'REFUNDED');
    const map = new Map<string, { ean: string; sku: string; name: string; qty: number; revenue: number; cost: number }>();

    for (const order of validOrders) {
      for (const item of order.items || []) {
        if (selectedProductIds.length > 0 && !selectedProductIds.includes(item.productId)) continue;

        const ean = String((item as any).ean ?? '—');
        const key = item.productId || item.sku;
        const existing = map.get(key);

        if (existing) {
          existing.qty += item.quantity;
          existing.revenue += item.price * item.quantity;
          existing.cost += (item.cost || 0) * item.quantity;
        } else {
          map.set(key, {
            ean,
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
  }, [allOrders, selectedProductIds]);

  const filteredSalesDetail = useMemo(() => {
    if (selectedProductIds.length === 0) return [] as Array<{
      orderNumber: string;
      date: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      shippingAddress: string;
      source: string;
      status: string;
      paymentMethod: string;
      isPresale: boolean;
      quantity: number;
      price: number;
      subtotal: number;
    }>;

    const validOrders = allOrders.filter((order) => order.status !== 'CANCELLED' && order.status !== 'REFUNDED');

    return validOrders.flatMap((order) => {
      const paymentMethod = getPaymentLabel(order.payments?.[0]?.method);

      return (order.items || [])
        .filter((item) => selectedProductIds.includes(item.productId))
        .map((item) => ({
          orderNumber: order.orderNumber,
          date: new Date(order.createdAt).toLocaleDateString('es-CL'),
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone || '',
          shippingAddress: getShippingAddress(order),
          source: SOURCE_LABELS[order.source] || order.source,
          status: STATUS_LABELS[order.status] || order.status,
          paymentMethod,
          isPresale: !!(item as any).isPresale,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        }));
    });
  }, [allOrders, selectedProductIds]);

  const paymentMethodSummary = useMemo(() => {
    const validOrders = allOrders.filter((order) => order.status !== 'CANCELLED' && order.status !== 'REFUNDED');
    const map: Record<string, { label: string; total: number; count: number }> = {
      CARD: { label: '💳 Tarjeta (Getnet)', total: 0, count: 0 },
      CASH: { label: '💵 Efectivo', total: 0, count: 0 },
      TRANSFER: { label: '🏦 Transferencia', total: 0, count: 0 },
    };

    for (const order of validOrders) {
      const method = order.payments?.[0]?.method;
      if (method === 'CARD' || method === 'GETNET') {
        map.CARD.total += order.total;
        map.CARD.count += 1;
      } else if (method === 'CASH') {
        map.CASH.total += order.total;
        map.CASH.count += 1;
      } else if (method === 'TRANSFER') {
        map.TRANSFER.total += order.total;
        map.TRANSFER.count += 1;
      }
    }

    return Object.values(map);
  }, [allOrders]);

  const showInitialLoading =
    (statsLoading && !stats) ||
    (chartLoading && !chartData) ||
    (ordersLoading && !ordersData);

  if (showInitialLoading) {
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
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl text-foreground mb-1">Panel de Ventas</h1>
            <p className="text-muted-foreground text-sm">
              {kpis.count} {kpis.count === 1 ? 'venta' : 'ventas'} en el período seleccionado
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(['today', 'week', 'month'] as DatePreset[]).map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    datePreset === preset
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {preset === 'today' ? 'Hoy' : preset === 'week' ? '7 días' : '30 días'}
                </button>
              ))}
            </div>

            <button
              type="button"
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

        <ProductFilterBar selectedProductIds={selectedProductIds} onFilterChange={setSelectedProductIds} />
      </div>

      {datePreset === 'custom' && (
        <div className="flex items-center gap-3 mb-6 p-3 bg-secondary rounded-lg flex-wrap">
          <label className="text-xs text-muted-foreground">Desde</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <label className="text-xs text-muted-foreground">Hasta</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <DashboardWidget
          title="Ventas"
          value={formatCLP(kpis.sales)}
          icon={DollarSign}
          variant="primary"
          trend={{ value: kpis.count, label: 'órdenes' }}
        />
        <DashboardWidget title="Costos" value={formatCLP(kpis.cost)} icon={Receipt} variant="warning" />
        <DashboardWidget
          title="Margen"
          value={formatCLP(kpis.margin)}
          icon={TrendingUp}
          variant="success"
          trend={{ value: Math.round(kpis.marginPct * 10) / 10, label: 'margen %' }}
        />
      </div>

      <div className="mb-8">
        <SalesChart data={chartData || []} />
      </div>

      {allOrders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {paymentMethodSummary.map((payment) => (
            <div key={payment.label} className="bg-secondary/50 border border-border/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">{payment.label}</p>
              <p className="text-lg text-foreground font-semibold">{formatCLP(payment.total)}</p>
              <p className="text-xs text-muted-foreground">
                {payment.count} {payment.count === 1 ? 'orden' : 'órdenes'}
              </p>
            </div>
          ))}
        </div>
      )}

      {selectedProductIds.length > 0 && (
        <div className="mb-8">
          <InventoryDiscrepancyPanel data={inventoryData?.products ?? []} error={inventoryError} />
        </div>
      )}

      {productSummary.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{selectedProductIds.length > 0 ? 'Resumen por Producto' : 'Resumen por EAN'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-normal">EAN</th>
                    <th className="text-left py-2 text-muted-foreground font-normal">Producto</th>
                    <th className="text-left py-2 text-muted-foreground font-normal">SKU</th>
                    <th className="text-right py-2 text-muted-foreground font-normal">Uds.</th>
                    <th className="text-right py-2 text-muted-foreground font-normal">Venta</th>
                    <th className="text-right py-2 text-muted-foreground font-normal">Costo</th>
                    <th className="text-right py-2 text-muted-foreground font-normal">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {productSummary.map((row, index) => (
                    <tr key={index} className="border-b border-border/50 hover:bg-secondary/50">
                      <td className="py-2.5 text-foreground font-mono text-xs">{row.ean}</td>
                      <td className="py-2.5 text-foreground truncate max-w-[200px]">{row.name}</td>
                      <td className="py-2.5 text-muted-foreground font-mono text-xs">{row.sku}</td>
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

      <Card>
        <CardHeader>
          <CardTitle>{selectedProductIds.length > 0 ? 'Ventas del Producto Seleccionado' : 'Detalle de Ventas'}</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedProductIds.length > 0 ? (
            filteredSalesDetail.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay ventas de este producto en el período</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-normal">Orden</th>
                      <th className="text-left py-2 text-muted-foreground font-normal">Fecha</th>
                      <th className="text-left py-2 text-muted-foreground font-normal">Cliente</th>
                      <th className="text-left py-2 text-muted-foreground font-normal">Contacto</th>
                      <th className="text-left py-2 text-muted-foreground font-normal">Dirección envío</th>
                      <th className="text-left py-2 text-muted-foreground font-normal">Canal</th>
                      <th className="text-left py-2 text-muted-foreground font-normal">Pago</th>
                      <th className="text-left py-2 text-muted-foreground font-normal">Tipo</th>
                      <th className="text-left py-2 text-muted-foreground font-normal">Estado</th>
                      <th className="text-right py-2 text-muted-foreground font-normal">Cant.</th>
                      <th className="text-right py-2 text-muted-foreground font-normal">Precio</th>
                      <th className="text-right py-2 text-muted-foreground font-normal">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSalesDetail.map((row, index) => (
                      <tr key={index} className="border-b border-border/50 hover:bg-secondary/50">
                        <td className="py-2.5 text-foreground font-mono text-xs">{row.orderNumber}</td>
                        <td className="py-2.5 text-muted-foreground text-xs">{row.date}</td>
                        <td className="py-2.5 text-foreground text-xs truncate max-w-[140px]">{row.customerName}</td>
                        <td className="py-2.5 text-muted-foreground text-xs">
                          {row.customerEmail && <span className="block truncate max-w-[160px]">{row.customerEmail}</span>}
                          {row.customerPhone && <span className="block text-[10px]">{row.customerPhone}</span>}
                        </td>
                        <td className="py-2.5 text-muted-foreground text-xs max-w-[220px] break-words">{row.shippingAddress}</td>
                        <td className="py-2.5">
                          <Badge variant="default" size="sm">{row.source}</Badge>
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground">{row.paymentMethod}</td>
                        <td className="py-2.5">
                          {row.isPresale ? <Badge variant="presale" size="sm">Preventa</Badge> : <span className="text-xs text-muted-foreground">Venta</span>}
                        </td>
                        <td className="py-2.5">
                          <Badge
                            variant={
                              row.status === 'Entregado'
                                ? 'success'
                                : row.status === 'Cancelado' || row.status === 'Reembolsado'
                                  ? 'danger'
                                  : row.status === 'Enviado'
                                    ? 'info'
                                    : row.status === 'Procesando'
                                      ? 'warning'
                                      : 'default'
                            }
                            size="sm"
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right text-foreground">{row.quantity}</td>
                        <td className="py-2.5 text-right text-foreground font-mono">{formatCLP(row.price)}</td>
                        <td className="py-2.5 text-right text-foreground font-mono">{formatCLP(row.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary/50 font-semibold">
                      <td colSpan={9} className="py-2.5 text-muted-foreground">
                        Total ({filteredSalesDetail.length} ventas)
                      </td>
                      <td className="py-2.5 text-right text-foreground">
                        {filteredSalesDetail.reduce((sum, row) => sum + row.quantity, 0)}
                      </td>
                      <td className="py-2.5 text-right"></td>
                      <td className="py-2.5 text-right text-primary font-mono">
                        {formatCLP(filteredSalesDetail.reduce((sum, row) => sum + row.subtotal, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          ) : allOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay ventas en este período</p>
          ) : (
            <div className="space-y-2">
              {allOrders.map((order) => {
                const isExpanded = expandedOrder === order.id;
                const itemCost = (order.items || []).reduce((sum, item) => sum + (item.cost || 0) * item.quantity, 0);
                const orderMargin = order.total - itemCost;

                return (
                  <div key={order.id} className="border border-border/50 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm text-foreground font-mono">{order.orderNumber}</span>
                            <Badge
                              variant={
                                order.status === 'DELIVERED'
                                  ? 'success'
                                  : order.status === 'CANCELLED' || order.status === 'REFUNDED'
                                    ? 'danger'
                                    : order.status === 'SHIPPED'
                                      ? 'info'
                                      : order.status === 'PROCESSING'
                                        ? 'warning'
                                        : 'default'
                              }
                              size="sm"
                            >
                              {STATUS_LABELS[order.status] || order.status}
                            </Badge>
                            <Badge variant="default" size="sm">{SOURCE_LABELS[order.source] || order.source}</Badge>
                            {order.payments?.[0]?.method && (
                              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                {getPaymentLabel(order.payments[0].method)}
                              </span>
                            )}
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
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
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
                            {(order.items || []).map((item, index) => (
                              <tr key={index} className="border-t border-border/30">
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
                        <p className="text-xs text-muted-foreground mt-1">🚚 {getShippingAddress(order)}</p>
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
