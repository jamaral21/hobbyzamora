import { DollarSign, TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { DashboardWidget } from '../../components/admin/DashboardWidget';
import { SalesChart } from '../../components/admin/SalesChart';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { mockDashboardStats, mockSalesChartData, mockTopProducts, mockOrders } from '../../data/mockData';
import { Link } from 'react-router';

export default function DashboardPage() {
  const recentOrders = mockOrders.slice(0, 5);

  return (
    <AdminLayout>
      {/* Developer Navigation Badge */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link to="/nav">
          <Button size="sm" className="shadow-lg">
            🗺️ View All Pages
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardWidget
          title="Daily Sales"
          value={`$${mockDashboardStats.dailySales.toFixed(2)}`}
          icon={DollarSign}
          variant="purple"
          trend={{ value: 12.5, label: 'vs yesterday' }}
        />
        <DashboardWidget
          title="Weekly Sales"
          value={`$${mockDashboardStats.weeklySales.toFixed(2)}`}
          icon={TrendingUp}
          variant="blue"
          trend={{ value: 8.3, label: 'vs last week' }}
        />
        <DashboardWidget
          title="Monthly Revenue"
          value={`$${mockDashboardStats.monthlySales.toFixed(2)}`}
          icon={DollarSign}
          variant="green"
          trend={{ value: 15.7, label: 'vs last month' }}
        />
        <DashboardWidget
          title="Low Stock Items"
          value={mockDashboardStats.lowStockItems}
          icon={AlertTriangle}
          variant="orange"
        />
      </div>

      {/* Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SalesChart data={mockSalesChartData} />

        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTopProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {product.sales} sold
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    ${product.revenue.toFixed(2)}
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
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {order.orderNumber}
                    </span>
                    <Badge
                      variant={
                        order.status === 'delivered'
                          ? 'success'
                          : order.status === 'shipped'
                          ? 'info'
                          : order.status === 'processing'
                          ? 'warning'
                          : 'default'
                      }
                      size="sm"
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.customer} • {new Date(order.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}