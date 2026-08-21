import { useEffect, useMemo, useState } from 'react';
import { Search, User, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { customersAPI, type Customer, type CustomersSummary } from '../../lib/api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { formatChileDate } from '../../lib/chileDate';

const formatAmount = (value: number) => `$${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value)}`;

export default function CustomersPage() {
  const { isAuthenticated } = useAdminAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState<CustomersSummary>({ totalSpent: 0, totalOrders: 0 });
  const searchParam = useMemo(() => search.trim() || undefined, [search]);

  const fetchCustomers = async (page = 1, query = searchParam) => {
    setLoading(true);
    try {
      const res = await customersAPI.getAll({ search: query, page, limit: 50 });
      setCustomers(res.customers);
      setPagination(res.pagination);
      setSummary(res.summary);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchCustomers();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timeout = setTimeout(() => fetchCustomers(1, searchParam), 300);
    return () => clearTimeout(timeout);
  }, [searchParam, isAuthenticated]);

  const totalSpentAll = summary.totalSpent;
  const avgSpent = pagination.total > 0 ? totalSpentAll / pagination.total : 0;

  if (loading && customers.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Clientes</h2>
            <p className="text-muted-foreground">Gestiona la información de tus clientes</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Clientes</p>
            <p className="text-2xl font-bold text-foreground">{pagination.total}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Gasto Total</p>
            <p className="text-2xl font-bold text-primary">{formatAmount(totalSpentAll)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-1">Gasto Promedio</p>
            <p className="text-2xl font-bold text-foreground">{formatAmount(avgSpent)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar clientes por nombre o email..."
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Customers Table */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron clientes
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Total Gastado</TableHead>
                  <TableHead>Ticket Promedio</TableHead>
                  <TableHead>Miembro Desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{customer.totalOrders}</span>
                      <span className="text-muted-foreground text-sm ml-1">pedidos</span>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatAmount(customer.totalSpent)}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {formatAmount(customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatChileDate(customer.joinDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === pagination.page ? 'primary' : 'outline'}
                size="sm"
                onClick={() => fetchCustomers(p, searchParam)}
              >
                {p}
              </Button>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
