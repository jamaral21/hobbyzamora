import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, Filter, Download, Eye, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [eanFilter, setEanFilter] = useState('');
  const [skuFilter, setSkuFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const hasActiveExtraFilters = sourceFilter !== 'all' || dateFrom !== '' || dateTo !== '' || eanFilter !== '' || skuFilter !== '';

  const resetPage = () => setPage(1);

  const clearExtraFilters = () => {
    setSourceFilter('all');
    setDateFrom('');
    setDateTo('');
    setEanFilter('');
    setSkuFilter('');
    resetPage();
  };

  const { data: ordersData, isLoading } = useOrders(
    {
      status: statusFilter !== 'all' ? statusFilter.toUpperCase() : undefined,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: isAuthenticated }
  );

  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination;

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
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter.toUpperCase();
      const matchesSource =
        sourceFilter === 'all' || (order.source || '').toUpperCase() === sourceFilter.toUpperCase();
      const orderDate = new Date(order.createdAt);
      const matchesFrom = dateFrom === '' || orderDate >= new Date(dateFrom);
      const matchesTo = dateTo === '' || orderDate <= new Date(dateTo + 'T23:59:59');
      const matchesEan =
        eanFilter === '' ||
        (Array.isArray(order.items) &&
          order.items.some((item: any) =>
            (item.barcode || item.ean || item.product?.barcode || '')
              .toLowerCase()
              .includes(eanFilter.toLowerCase())
          ));
      const matchesSku =
        skuFilter === '' ||
        (Array.isArray(order.items) &&
          order.items.some((item: any) =>
            (item.sku || item.product?.sku || '')
              .toLowerCase()
              .includes(skuFilter.toLowerCase())
          ));
      return matchesSearch && matchesStatus && matchesSource && matchesFrom && matchesTo && matchesEan && matchesSku;
    });
  }, [orders, searchQuery, statusFilter, sourceFilter, dateFrom, dateTo, eanFilter, skuFilter]);

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
              onChange={(e) => { setSearchQuery(e.target.value); resetPage(); }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
            className="px-4 py-2 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todos los Estados</option>
            <option value="pending">Pendiente</option>
            <option value="processing">Procesando</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>

          <Button
            variant={hasActiveExtraFilters ? 'primary' : 'outline'}
            onClick={() => setShowMoreFilters(v => !v)}
          >
            <Filter className="w-4 h-4" />
            Más Filtros
            {hasActiveExtraFilters && (
              <span className="ml-1.5 bg-white/20 text-xs rounded-full px-1.5 py-0.5 leading-none">
                {[sourceFilter !== 'all', dateFrom !== '', dateTo !== '', eanFilter !== '', skuFilter !== ''].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Panel de filtros avanzados */}
        {showMoreFilters && (
          <div className="flex flex-wrap gap-4 mb-4 p-4 bg-secondary rounded-lg border border-border">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Fuente</label>
              <select
                value={sourceFilter}
                onChange={(e) => { setSourceFilter(e.target.value); resetPage(); }}
                className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="all">Todas</option>
                <option value="ONLINE">Online</option>
                <option value="POS">POS</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">EAN / Código de barras</label>
              <input
                type="text"
                placeholder="Buscar por EAN..."
                value={eanFilter}
                onChange={(e) => { setEanFilter(e.target.value); resetPage(); }}
                className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">SKU</label>
              <input
                type="text"
                placeholder="Buscar por SKU..."
                value={skuFilter}
                onChange={(e) => { setSkuFilter(e.target.value); resetPage(); }}
                className="px-3 py-1.5 rounded-lg border border-border bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
              />
            </div>
            {hasActiveExtraFilters && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearExtraFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar
                </button>
              </div>
            )}
          </div>
        )}

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

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-sm text-muted-foreground">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} pedidos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-foreground px-2">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
