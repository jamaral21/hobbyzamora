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
        let orderData = await ordersAPI.getById(orderId!);

        if (orderData.status === 'PENDING' && orderData.payments?.length) {
          const pendingPayment = orderData.payments.find((p: any) => p.status === 'PENDING');
          if (pendingPayment) {
            try {
              await paymentsAPI.querySession({ paymentId: pendingPayment.id });
              orderData = await ordersAPI.getById(orderId!);
            } catch {
              // Ignorar errores de consulta
            }
          }
        }

        setOrder(orderData);

        if (orderData.status === 'PROCESSING' || orderData.status === 'DELIVERED') {
          clearCart();
        }
      } catch (err) {
        console.error('Error al cargar pedido:', err);
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
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
  const fmt = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendiente',
    PROCESSING: 'En Proceso',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado',
  };

  return (
    <StoreLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="text-center">
          <CardContent>
            <div className="w-16 h-16 bg-[#00e676]/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#00e676]" />
            </div>

            <h1 className="text-primary mb-2">PEDIDO CONFIRMADO</h1>
            <p className="text-muted-foreground mb-8">
              Gracias por tu compra.{email ? ` Enviamos una confirmación a ${email}` : ''}
            </p>

            <div className="bg-secondary rounded-lg p-6 mb-8">
              <p className="text-sm text-muted-foreground mb-1">Número de Pedido</p>
              <p className="text-2xl text-primary font-bold font-[family-name:var(--font-mono)]">{orderNumber}</p>
            </div>

            {/* Items del pedido */}
            {order?.items && order.items.length > 0 && (
              <div className="text-left mb-8">
                <h3 className="text-sm font-medium text-foreground mb-3">Artículos</h3>
                <div className="divide-y divide-border">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-3 text-sm">
                      <div>
                        <span className="text-foreground">{item.name}</span>
                        <span className="text-muted-foreground"> × {item.quantity}</span>
                      </div>
                      <span className="text-foreground font-[family-name:var(--font-mono)]">
                        ${(item.price * item.quantity).toLocaleString('es-CL', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 mt-1 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-[family-name:var(--font-mono)]">${order.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Impuesto</span>
                    <span className="font-[family-name:var(--font-mono)]">${order.tax?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary font-bold font-[family-name:var(--font-mono)]">${order.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 border border-border rounded-lg">
                <Package className="w-6 h-6 text-accent mx-auto mb-2" />
                <h3 className="text-sm text-foreground mb-1">
                  Entrega Estimada
                </h3>
                <p className="text-sm text-muted-foreground">
                  {fmt(deliveryStart)} - {fmt(deliveryEnd)}
                </p>
              </div>
              <div className="p-4 border border-border rounded-lg">
                <h3 className="text-sm text-foreground mb-1">
                  Estado
                </h3>
                <Badge variant={order?.status === 'PROCESSING' ? 'success' : order?.status === 'DELIVERED' ? 'success' : 'warning'}>
                  {statusLabel[order?.status] || order?.status || 'Pendiente'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <Link to="/store/products">
                <Button fullWidth size="lg">Seguir Comprando</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </StoreLayout>
  );
}
