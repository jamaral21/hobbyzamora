import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router';
import { Lock, Star, Clock, Loader2, Package, CreditCard, CheckCircle, ShieldAlert } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { ProductListingPageContent } from './ProductListingPage';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { ordersAPI, Order } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

type PresaleTab = 'reservas' | 'disponibles';

function PresaleKPICard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex-1 p-5 bg-card border border-border rounded-xl text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Reservado',
  PROCESSING: 'Por pagar',
  SHIPPED: 'Enviado',
  DELIVERED: 'Pagado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'info',
  PROCESSING: 'warning',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
};

function MisReservasContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersAPI.getMyOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter orders that contain presale items
  const presaleOrders = useMemo(() => {
    return orders.filter(order =>
      order.items?.some((item: any) => item.product?.isPresale || item.isPresale)
    );
  }, [orders]);

  // If no presale flag on items, fallback: show all orders (the backend should ideally tag them)
  // For now, show all orders as potential presale reservations since the page is presale-only
  const displayOrders = presaleOrders.length > 0 ? presaleOrders : orders;

  const kpis = useMemo(() => {
    const reserved = displayOrders.filter(o => o.status === 'PENDING').length;
    const pending = displayOrders.filter(o => o.status === 'PROCESSING').length;
    const paid = displayOrders.filter(o => o.status === 'DELIVERED' || o.status === 'SHIPPED').length;
    return { reserved, pending, paid };
  }, [displayOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="flex gap-4">
        <PresaleKPICard value={kpis.reserved} label="Reservados" color="text-primary" />
        <PresaleKPICard value={kpis.pending} label="Por pagar" color="text-amber-400" />
        <PresaleKPICard value={kpis.paid} label="Pagados" color="text-[#00e676]" />
      </div>

      {/* Reservation List */}
      {displayOrders.length === 0 ? (
        <Card className="text-center py-12">
          <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-lg text-foreground mb-2">Sin reservas</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Aún no has reservado productos en preventa
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4">
                  {/* Product Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    {item.product?.images?.[0] ? (
                      <img
                        src={typeof item.product.images === 'string'
                          ? (() => { try { return JSON.parse(item.product.images)[0]; } catch { return item.product.images; } })()
                          : Array.isArray(item.product.images) ? item.product.images[0] : ''}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/store/product/${item.productId}`} className="hover:text-primary transition-colors">
                      <h3 className="text-sm font-medium text-foreground truncate">{item.name}</h3>
                    </Link>
                    <p className="text-lg font-bold text-primary font-[family-name:var(--font-mono)] mt-0.5">
                      ${(item.price * item.quantity).toLocaleString('es-CL')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reservado el {new Date(order.createdAt).toLocaleDateString('es-CL')}
                      {item.quantity > 1 && ` · ${item.quantity} unidades`}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <Badge variant={STATUS_VARIANT[order.status] || 'default'}>
                    {STATUS_LABELS[order.status] || order.status}
                  </Badge>
                </div>
              ))}

              {/* Footer with status message */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
                <p className="text-xs text-muted-foreground">
                  {order.status === 'PENDING' && 'Esperando confirmación de llegada…'}
                  {order.status === 'PROCESSING' && 'Producto disponible — pendiente de pago'}
                  {order.status === 'SHIPPED' && 'Pago confirmado — en camino'}
                  {order.status === 'DELIVERED' && 'Entregado'}
                  {order.status === 'CANCELLED' && 'Reserva cancelada por el administrador'}
                </p>
                {order.status === 'PROCESSING' && (
                  <Link to={`/store/order-confirmation?orderId=${order.id}`}>
                    <Button size="sm" variant="primary">
                      <CreditCard className="w-3.5 h-3.5" />
                      Pagar
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PresalesPage() {
  const [activeTab, setActiveTab] = useState<PresaleTab>('reservas');
  const { user } = useAuth();

  return (
    <StoreLayout>
      <RequireAuth message="Inicia sesión para ver preventas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-primary/70" />
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-primary/70">
                Exclusivo para miembros
              </span>
            </div>
            <h1 className="text-3xl text-foreground mb-2">Mis Preventas</h1>
            <p className="text-muted-foreground">
              Reserva productos antes de su llegada al precio de preventa. Solo 1 reserva por producto por cuenta.
            </p>
          </div>

          {/* Presale Ban Check */}
          {user?.presaleBanned ? (
            <Card className="text-center py-12">
              <ShieldAlert className="w-12 h-12 text-destructive/50 mx-auto mb-4" />
              <h3 className="text-lg text-foreground mb-2">Acceso a preventas suspendido</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Tu acceso a preventas ha sido suspendido debido a reservas no pagadas. 
                Si crees que es un error, contáctanos por Instagram o email.
              </p>
            </Card>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 mb-8 w-fit">
                <button
                  onClick={() => setActiveTab('reservas')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
                    activeTab === 'reservas'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  Mis Reservas
                </button>
                <button
                  onClick={() => setActiveTab('disponibles')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
                    activeTab === 'disponibles'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Disponibles
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'reservas' ? (
                <MisReservasContent />
              ) : (
                <ProductListingPageContent presalesOnly />
              )}
            </>
          )}
        </div>
      </RequireAuth>
    </StoreLayout>
  );
}
