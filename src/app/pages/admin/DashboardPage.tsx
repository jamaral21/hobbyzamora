import { DollarSign, TrendingUp, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { DashboardWidget } from '../../components/admin/DashboardWidget';
import { SalesChart } from '../../components/admin/SalesChart';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { useDashboardStats, useSalesChart, useTopProducts, useOrders } from '../../hooks/useData';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Link } from 'react-router';

export default function DashboardPage() {
  const { isAuthenticated } = useAdminAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats({ enabled: isAuthenticated });
  const { data: chartData, isLoading: chartLoading } = useSalesChart(10, { enabled: isAuthenticated });
  const { data: topProducts, isLoading: productsLoading } = useTopProducts(5, 'month', { enabled: isAuthenticated });
  const { data: orders, isLoading: ordersLoading } = useOrders({ limit: 5 }, { enabled: isAuthenticated });

  const recentOrders = orders || [];

  // Loading state
  if (statsLoading || chartLoading || productsLoading || ordersLoading) {
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
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido de vuelta. Esto es lo que está pasando hoy.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardWidget
          title="Ventas Diarias"
          value={`$${(stats?.dailySales || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          variant="primary"
          trend={{ value: 12.5, label: 'vs ayer' }}
        />
        <DashboardWidget
          title="Ventas Semanales"
          value={`$${(stats?.weeklySales || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`}
          icon={TrendingUp}
          variant="accent"
          trend={{ value: 8.3, label: 'vs semana pasada' }}
        />
        <DashboardWidget
          title="Ingresos Mensuales"
          value={`$${(stats?.monthlySales || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          variant="success"
          trend={{ value: 15.7, label: 'vs mes pasado' }}
        />
        <DashboardWidget
          title="Stock Bajo"
          value={stats?.lowStockItems || 0}
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SalesChart data={chartData || []} />

        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(topProducts || []).map((product, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.sales} vendidos
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-foreground">
                    ${product.revenue.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-secondary rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm text-foreground">
                      {order.orderNumber}
                    </span>
                    <Badge
                      variant={
                        order.status === 'DELIVERED'
                          ? 'success'
                          : order.status === 'SHIPPED'
                          ? 'info'
                          : order.status === 'PROCESSING'
                          ? 'warning'
                          : 'default'
                      }
                      size="sm"
                    >
                      {order.status.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.customerName} • {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm text-foreground">
                  ${order.total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}