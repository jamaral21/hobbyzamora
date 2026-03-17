import { useEffect, useState } from 'react';
import { Search, User, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { Badge } from '../../components/design-system/Badge';
import { customersAPI, type Customer } from '../../lib/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  const fetchCustomers = async (page = 1) => {
    setLoading(true);
    try {
      const res = await customersAPI.getAll({ search: search || undefined, page, limit: 50 });
      setCustomers(res.customers);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => fetchCustomers(), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const totalSpentAll = customers.reduce((s, c) => s + c.totalSpent, 0);
  const avgSpent = customers.length > 0 ? totalSpentAll / customers.length : 0;

  if (loading && customers.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h2>
            <p className="text-gray-600 dark:text-gray-400">Gestiona la información de tus clientes</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Clientes</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pagination.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gasto Total</p>
            <p className="text-2xl font-bold text-purple-600">${totalSpentAll.toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gasto Promedio</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${avgSpent.toFixed(2)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              placeholder="Buscar clientes por nombre o email..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Customers Table */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No se encontraron clientes
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Total Gastado</TableHead>
                  <TableHead>Miembro Desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{customer.totalOrders}</span>
                      <span className="text-gray-500 text-sm ml-1">pedidos</span>
                    </TableCell>
                    <TableCell className="font-semibold text-purple-600">
                      ${customer.totalSpent.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(customer.joinDate).toLocaleDateString()}
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
                onClick={() => fetchCustomers(p)}
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
