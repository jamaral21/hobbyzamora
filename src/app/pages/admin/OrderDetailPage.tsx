import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Package, CreditCard, Truck, Loader2, AlertCircle } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Card } from '../../components/design-system/Card';
import { useOrder, useUpdateOrderStatus } from '../../hooks/useData';

const STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  PENDING: 'default',
  PROCESSING: 'warning',
  SHIPPED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, error, refetch } = useOrder(id);
  const { mutate: updateStatus, isLoading: isUpdating } = useUpdateOrderStatus();
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setStatusError(null);
    try {
      await updateStatus(id, newStatus);
      await refetch();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <p className="text-muted-foreground">{error || 'Pedido no encontrado'}</p>
          <Button variant="outline" onClick={() => navigate('/admin/orders')}>
            <ArrowLeft className="w-4 h-4" /> Volver a Pedidos
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/orders')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Pedidos
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-foreground mb-1">
              {order.orderNumber}
            </h1>
            <p className="text-muted-foreground">
              {new Date(order.createdAt).toLocaleString()} &middot; {order.source}
            </p>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[order.status] || 'default'} size="md">
            {order.status.toLowerCase()}
          </Badge>
        </div>
      </div>

      {/* Status Error */}
      {statusError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {statusError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items + Customer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Items</h2>
            </div>
            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  <div className="w-12 h-12 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                    {item.product?.images?.[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.sku}
                      {item.variantName && ` · ${item.variantName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">
                      ${item.price.toFixed(2)} × {item.quantity}
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>IVA (16%)</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              {order.shipping > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Envío</span>
                  <span>${order.shipping.toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-[#00e676]">
                  <span>Descuento</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-foreground pt-2 border-t border-border">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Payments */}
          {order.payments && order.payments.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Pagos</h2>
              </div>
              <div className="divide-y divide-border">
                {order.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {payment.method}
                      </p>
                      {payment.paidAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.paidAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={payment.status === 'APPROVED' ? 'success' : payment.status === 'DECLINED' ? 'danger' : 'default'}>
                        {payment.status.toLowerCase()}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        ${payment.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Customer + Status Update */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <h2 className="text-lg font-semibold text-foreground mb-4">Cliente</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Nombre</p>
                <p className="text-sm text-foreground">{order.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground">{order.customerEmail}</p>
              </div>
              {order.customerPhone && (
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="text-sm text-foreground">{order.customerPhone}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Update Status */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Actualizar Estado</h2>
            </div>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  disabled={order.status === status || isUpdating}
                  onClick={() => handleStatusChange(status)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                    ${order.status === status
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{status.toLowerCase()}</span>
                    {order.status === status && (
                      <span className="text-xs">Actual</span>
                    )}
                    {isUpdating && order.status !== status && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
