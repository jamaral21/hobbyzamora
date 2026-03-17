import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle, Package, Loader2 } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { Card, CardContent } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { ordersAPI, paymentsAPI } from '../../lib/api';
import { useCartStore } from '../../lib/store';

export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!!orderId);
  const { clearCart } = useCartStore();

  useEffect(() => {
    if (!orderId) return;

    async function loadOrder() {
      try {
        // First load the order
        let orderData = await ordersAPI.getById(orderId!);

        // If order is still PENDING, try to resolve payment via Getnet query
        if (orderData.status === 'PENDING' && orderData.payments?.length) {
          const pendingPayment = orderData.payments.find((p: any) => p.status === 'PENDING');
          if (pendingPayment) {
            try {
              await paymentsAPI.querySession({ paymentId: pendingPayment.id });
              // Reload order to get updated status
              orderData = await ordersAPI.getById(orderId!);
            } catch {
              // Ignore query errors — payment may not be resolved yet
            }
          }
        }

        setOrder(orderData);

        // Clear cart if payment was successful
        if (orderData.status === 'PROCESSING' || orderData.status === 'DELIVERED') {
          clearCart();
        }
      } catch (err) {
        console.error('Failed to load order:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrder();
  }, [orderId, clearCart]);

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </StoreLayout>
    );
  }

  const orderNumber = order?.orderNumber || 'N/A';
  const email = order?.customerEmail || '';
  const deliveryStart = new Date();
  deliveryStart.setDate(deliveryStart.getDate() + 5);
  const deliveryEnd = new Date();
  deliveryEnd.setDate(deliveryEnd.getDate() + 7);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <StoreLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="text-center">
          <CardContent>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>

            <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">
              Order Confirmed!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Thank you for your purchase.{email ? ` We've sent a confirmation email to ${email}` : ''}
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Order Number</p>
              <p className="text-2xl text-gray-900 dark:text-gray-100">{orderNumber}</p>
            </div>

            {/* Order Items */}
            {order?.items && order.items.length > 0 && (
              <div className="text-left mb-8">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Items</h3>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-3 text-sm">
                      <div>
                        <span className="text-gray-900 dark:text-gray-100">{item.name}</span>
                        <span className="text-gray-500 dark:text-gray-400"> × {item.quantity}</span>
                      </div>
                      <span className="text-gray-900 dark:text-gray-100">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-1 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Subtotal</span><span>${order.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Tax</span><span>${order.tax?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-200 dark:border-gray-800">
                    <span>Total</span><span>${order.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                <Package className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                  Estimated Delivery
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {fmt(deliveryStart)} - {fmt(deliveryEnd)}
                </p>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                  Status
                </h3>
                <Badge variant={order?.status === 'PROCESSING' ? 'success' : 'default'}>
                  {order?.status || 'PENDING'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <Link to="/store/products">
                <Button fullWidth size="lg">Continue Shopping</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </StoreLayout>
  );
}
