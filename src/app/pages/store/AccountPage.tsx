import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Input } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { ordersAPI, Order } from '../../lib/api';
import { User, Package, LogOut, Loader2, ChevronRight } from 'lucide-react';

export default function AccountPage() {
  return (
    <StoreLayout>
      <RequireAuth message="Inicia sesión para ver tu cuenta">
        <AccountContent />
      </RequireAuth>
    </StoreLayout>
  );
}

function AccountContent() {
  const { user, logout, updateProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });

  useEffect(() => {
    ordersAPI.getMyOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, []);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ name: form.name, phone: form.phone || undefined });
      setIsEditing(false);
    } catch {
      // keep editing open on error
    } finally {
      setIsSaving(false);
    }
  };

  const statusColor = (status: string): 'success' | 'info' | 'danger' | 'warning' => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'SHIPPED':
      case 'PROCESSING': return 'info';
      case 'CANCELLED':
      case 'REFUNDED': return 'danger';
      default: return 'warning';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <h1 className="text-3xl text-gray-900 dark:text-gray-100">Mi Cuenta</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <CardTitle>Perfil</CardTitle>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Input
                label="Nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Teléfono"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <div className="flex gap-3">
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : 'Guardar'}
                </Button>
                <Button variant="outline" onClick={() => { setIsEditing(false); setForm({ name: user?.name || '', phone: user?.phone || '' }); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500 dark:text-gray-400">Nombre:</span> <span className="text-gray-900 dark:text-gray-100">{user?.name}</span></p>
              <p><span className="text-gray-500 dark:text-gray-400">Email:</span> <span className="text-gray-900 dark:text-gray-100">{user?.email}</span></p>
              {user?.phone && (
                <p><span className="text-gray-500 dark:text-gray-400">Teléfono:</span> <span className="text-gray-900 dark:text-gray-100">{user.phone}</span></p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <CardTitle>Mis Pedidos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Aún no tienes pedidos</p>
              <Link to="/store/products">
                <Button variant="outline">Explorar productos</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/store/order-confirmation?orderId=${order.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' · '}{order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">${order.total.toFixed(2)}</p>
                      <Badge variant={statusColor(order.status)} className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="outline" onClick={logout} className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
        <LogOut className="w-4 h-4 mr-2" />
        Cerrar Sesión
      </Button>
    </div>
  );
}
