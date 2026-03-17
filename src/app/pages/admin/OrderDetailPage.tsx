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
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-gray-500 dark:text-gray-400">{error || 'Order not found'}</p>
          <Button variant="outline" onClick={() => navigate('/admin/orders')}>
            <ArrowLeft className="w-4 h-4" /> Back to Orders
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
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-1">
              {order.orderNumber}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
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
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {statusError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Items + Customer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Items</h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product?.images?.[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      SKU: {item.sku}
                      {item.variantName && ` · ${item.variantName}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      ${item.price.toFixed(2)} × {item.quantity}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Tax (IVA 16%)</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              {order.shipping > 0 && (
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span>Shipping</span>
                  <span>${order.shipping.toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Discount</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {/* Payments */}
          {order.payments && order.payments.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Payments</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {order.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {payment.method}
                      </p>
                      {payment.paidAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(payment.paidAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={payment.status === 'APPROVED' ? 'success' : payment.status === 'DECLINED' ? 'danger' : 'default'}>
                        {payment.status.toLowerCase()}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Customer</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{order.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{order.customerEmail}</p>
              </div>
              {order.customerPhone && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{order.customerPhone}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Update Status */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Update Status</h2>
            </div>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  disabled={order.status === status || isUpdating}
                  onClick={() => handleStatusChange(status)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                    ${order.status === status
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{status.toLowerCase()}</span>
                    {order.status === status && (
                      <span className="text-xs">Current</span>
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
