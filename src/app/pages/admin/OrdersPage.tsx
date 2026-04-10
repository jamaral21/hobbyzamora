import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, Filter, Download, Eye, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { Badge } from '../../components/design-system/Badge';
import { useOrders } from '../../hooks/useData';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export default function OrdersPage() {
  const { isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: ordersData, isLoading } = useOrders(
    { status: statusFilter !== 'all' ? statusFilter.toUpperCase() : undefined },
    { enabled: isAuthenticated }
  );
  
  const orders = ordersData || [];

  const getItemsCount = (order: any) =>
    Array.isArray(order.items)
      ? order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
      : 0;

  const filteredOrders = useMemo(() => {
    return orders.filter((order: any) => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.customerEmail || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [orders, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, processing: 0, shipped: 0, delivered: 0 };
    orders.forEach((o: any) => {
      const status = o.status.toLowerCase();
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  }, [orders]);

  if (isLoading) {
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl text-foreground mb-2">Pedidos</h1>
            <p className="text-muted-foreground">
              Gestiona y rastrea los pedidos de clientes
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const headers = ['Pedido', 'Cliente', 'Email', 'Fecha', 'Artículos', 'Total', 'Estado'];
              const rows = filteredOrders.map((o: any) => [
                o.orderNumber,
                o.customerName || '',
                o.customerEmail || '',
                new Date(o.createdAt).toLocaleDateString(),
                getItemsCount(o),
                o.total.toLocaleString('es-CL', { maximumFractionDigits: 0 }),
                o.status.toLowerCase(),
              ]);
              const csvContent = [headers, ...rows]
                .map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');
              const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar pedidos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todos los Estados</option>
            <option value="pending">Pendiente</option>
            <option value="processing">Procesando</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>

          <Button variant="outline">
            <Filter className="w-4 h-4" />
            Más Filtros
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { key: 'pending', label: 'Pendiente' },
            { key: 'processing', label: 'Procesando' },
            { key: 'shipped', label: 'Enviado' },
            { key: 'delivered', label: 'Entregado' },
          ].map(({ key, label }) => {
            const count = statusCounts[key] || 0;
            return (
              <div
                key={key}
                className="p-4 bg-secondary rounded-lg"
              >
                <p className="text-sm text-muted-foreground mb-1">
                  {label}
                </p>
                <p className="text-2xl text-foreground">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Artículos</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredOrders.map((order: any) => (
            <TableRow key={order.id}>
              <TableCell>
                <p className="text-sm text-foreground">{order.orderNumber}</p>
              </TableCell>
              <TableCell>
                <div>
                  <p className="text-sm text-foreground">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                </div>
              </TableCell>
              <TableCell>
                {new Date(order.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>{getItemsCount(order)}</TableCell>
              <TableCell>${order.total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    order.status === 'DELIVERED'
                      ? 'success'
                      : order.status === 'SHIPPED'
                      ? 'info'
                      : order.status === 'PROCESSING'
                      ? 'warning'
                      : order.status === 'CANCELLED'
                      ? 'danger'
                      : 'default'
                  }
                >
                  {order.status.toLowerCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AdminLayout>
  );
}
