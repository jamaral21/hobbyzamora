import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle, Package, Loader2, XCircle, Clock, MapPin } from 'lucide-react';
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
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const { clearCart } = useCartStore();

  const pollPaymentStatus = useCallback(async (orderData: any) => {
    const pendingPayment = orderData.payments?.find((p: any) => p.status === 'PENDING');
    if (!pendingPayment) return orderData;

    try {
      const result = await paymentsAPI.querySession({ paymentId: pendingPayment.id });
      setPaymentStatus(result.status);

      if (result.status === 'APPROVED' || result.status === 'DECLINED') {
        const updatedOrder = await ordersAPI.getById(orderId!);
        setOrder(updatedOrder);
        if (result.status === 'APPROVED') {
          clearCart();
        }
        return updatedOrder;
      }
    } catch {
      // Ignore polling errors
    }
    return orderData;
  }, [orderId, clearCart]);

  useEffect(() => {
    if (!orderId) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    async function loadOrder() {
      try {
        let orderData = await ordersAPI.getById(orderId!);
        setOrder(orderData);

        if (orderData.status === 'PROCESSING' || orderData.status === 'DELIVERED') {
          clearCart();
          setPaymentStatus('APPROVED');
        } else if (orderData.status === 'PENDING' && orderData.payments?.length) {
          orderData = await pollPaymentStatus(orderData);

          // If still pending after first check, poll every 5 seconds for up to 60 seconds
          if (orderData.status === 'PENDING') {
            let attempts = 0;
            pollInterval = setInterval(async () => {
              attempts++;
              if (attempts >= 12) {
                if (pollInterval) clearInterval(pollInterval);
                return;
              }
              const updated = await pollPaymentStatus(orderData);
              if (updated.status !== 'PENDING') {
                if (pollInterval) clearInterval(pollInterval);
              }
            }, 5000);
          }
        }
      } catch (err) {
        console.error('Error al cargar pedido:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrder();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderId, clearCart, pollPaymentStatus]);

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando estado del pago...</p>
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
  const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendiente',
    PROCESSING: 'En Proceso',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado',
  };

  const isApproved = order?.status === 'PROCESSING' || order?.status === 'DELIVERED' || order?.status === 'SHIPPED';
  const isDeclined = order?.status === 'CANCELLED' || paymentStatus === 'DECLINED';
  const isPending = !isApproved && !isDeclined;

  return (
    <StoreLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="text-center">
          <CardContent>
            {/* Status Icon */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isApproved ? 'bg-[#00e676]/15' : isDeclined ? 'bg-red-500/15' : 'bg-yellow-500/15'
            }`}>
              {isApproved && <CheckCircle className="w-8 h-8 text-[#00e676]" />}
              {isDeclined && <XCircle className="w-8 h-8 text-red-400" />}
              {isPending && <Clock className="w-8 h-8 text-yellow-400 animate-pulse" />}
            </div>

            <h1 className="text-primary mb-2">
              {isApproved ? 'PEDIDO CONFIRMADO' : isDeclined ? 'PAGO RECHAZADO' : 'PAGO EN PROCESO'}
            </h1>
            <p className="text-muted-foreground mb-8">
              {isApproved && (email ? `Gracias por tu compra. Enviamos una confirmación a ${email}` : 'Gracias por tu compra.')}
              {isDeclined && 'Tu pago fue rechazado. Por favor intenta de nuevo con otro método de pago.'}
              {isPending && 'Estamos verificando tu pago. Esta página se actualizará automáticamente.'}
            </p>

            <div className="bg-secondary rounded-lg p-6 mb-8">
              <p className="text-sm text-muted-foreground mb-1">Número de Pedido</p>
              <p className="text-2xl text-primary font-bold font-[family-name:var(--font-mono)]">{orderNumber}</p>
            </div>

            {/* Shipping Address */}
            {order?.shippingStreet && (
              <div className="text-left mb-8 p-4 border border-border rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  Dirección de Envío
                </h3>
                <p className="text-sm text-muted-foreground">
                  {order.customerName}<br />
                  {order.shippingStreet}<br />
                  {order.shippingCity}, {order.shippingState} {order.shippingZip}<br />
                  {order.shippingCountry}
                </p>
              </div>
            )}

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
                        {item.variantName && (
                          <p className="text-xs text-muted-foreground">{item.variantName}</p>
                        )}
                      </div>
                      <span className="text-foreground font-[family-name:var(--font-mono)]">
                        ${(item.price * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 mt-1 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Neto</span>
                    <span className="font-[family-name:var(--font-mono)]">${((order.subtotal ?? 0) - (order.tax ?? 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA débito (19%)</span>
                    <span className="font-[family-name:var(--font-mono)]">${order.tax?.toFixed(2)}</span>
                  </div>
                  {order.shipping > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Envío</span>
                      <span className="font-[family-name:var(--font-mono)]">${order.shipping?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary font-bold font-[family-name:var(--font-mono)]">${order.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {isApproved && (
                <div className="p-4 border border-border rounded-lg">
                  <Package className="w-6 h-6 text-accent mx-auto mb-2" />
                  <h3 className="text-sm text-foreground mb-1">
                    Entrega Estimada
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {fmt(deliveryStart)} - {fmt(deliveryEnd)}
                  </p>
                </div>
              )}
              <div className={`p-4 border border-border rounded-lg ${!isApproved ? 'md:col-span-2' : ''}`}>
                <h3 className="text-sm text-foreground mb-1">
                  Estado
                </h3>
                <Badge variant={isApproved ? 'success' : isDeclined ? 'danger' : 'warning'}>
                  {statusLabel[order?.status] || order?.status || 'Pendiente'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {isDeclined && (
                <Link to="/store/checkout">
                  <Button fullWidth size="lg">Intentar de Nuevo</Button>
                </Link>
              )}
              <Link to="/store/products">
                <Button fullWidth size="lg" variant={isDeclined ? 'outline' : 'primary'}>
                  Seguir Comprando
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </StoreLayout>
  );
}
