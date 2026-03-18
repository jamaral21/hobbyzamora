import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { CheckoutSummary } from '../../components/store/CheckoutSummary';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Input } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import { CreditCard, Lock, Loader2 } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { ordersAPI, paymentsAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { RequireAuth } from '../../components/auth/RequireAuth';

export default function CheckoutPage() {
  return (
    <StoreLayout>
      <RequireAuth message="Inicia sesión para hacer checkout">
        <CheckoutForm />
      </RequireAuth>
    </StoreLayout>
  );
}

function CheckoutForm() {
  const { user } = useAuth();
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingData, setShippingData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zipCode: '', country: 'Chile'
  });
  const navigate = useNavigate();
  const { items: cartItems, clearCart, getSubtotal } = useCartStore();

  useEffect(() => {
    if (user) {
      const nameParts = (user.name || '').split(' ');
      setShippingData(prev => ({
        ...prev,
        firstName: prev.firstName || nameParts[0] || '',
        lastName: prev.lastName || nameParts.slice(1).join(' ') || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  const checkoutItems = cartItems.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    variant: item.variant
  }));

  const stepLabels = { shipping: 'Envío', payment: 'Pago', review: 'Revisión' };
  const steps: Array<'shipping' | 'payment' | 'review'> = ['shipping', 'payment', 'review'];

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setIsProcessing(true);
    try {
      const order = await ordersAPI.create({
        items: cartItems.map(item => ({ productId: item.productId, quantity: item.quantity })),
        customerName: `${shippingData.firstName} ${shippingData.lastName}`,
        customerEmail: shippingData.email,
        customerPhone: shippingData.phone,
        shippingAddress: {
          street: shippingData.address,
          city: shippingData.city,
          state: shippingData.state,
          zipCode: shippingData.zipCode,
          country: shippingData.country,
        },
      });
      
      const payment = await paymentsAPI.checkout(order.id);
      
      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
      } else {
        clearCart();
        navigate(`/store/order-confirmation?orderId=${order.id}`);
      }
    } catch (error: any) {
      console.error('Error en checkout:', error);
      alert(error?.message || 'Error al procesar el pedido. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-primary mb-8">CHECKOUT</h1>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {steps.map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-[family-name:var(--font-mono)] ${
                    step === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {idx + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${step === s ? 'text-primary' : 'text-muted-foreground'}`}>
                  {stepLabels[s]}
                </span>
              </div>
              {idx < 2 && (
                <div className="w-12 h-0.5 bg-border mx-2" />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Información de Envío */}
            {step === 'shipping' && (
              <Card>
                <CardHeader>
                  <CardTitle>Información de Envío</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Nombre" placeholder="Juan" required value={shippingData.firstName} onChange={(e) => setShippingData({...shippingData, firstName: e.target.value})} />
                    <Input label="Apellido" placeholder="Pérez" required value={shippingData.lastName} onChange={(e) => setShippingData({...shippingData, lastName: e.target.value})} />
                  </div>
                  <Input label="Email" type="email" placeholder="tu@email.com" required value={shippingData.email} onChange={(e) => setShippingData({...shippingData, email: e.target.value})} />
                  <Input label="Teléfono" type="tel" placeholder="+56 9 1234 5678" required value={shippingData.phone} onChange={(e) => setShippingData({...shippingData, phone: e.target.value})} />
                  <Input label="Dirección" placeholder="Av. Principal 123" required value={shippingData.address} onChange={(e) => setShippingData({...shippingData, address: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Ciudad" placeholder="Santiago" required value={shippingData.city} onChange={(e) => setShippingData({...shippingData, city: e.target.value})} />
                    <Input label="Región" placeholder="RM" required value={shippingData.state} onChange={(e) => setShippingData({...shippingData, state: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Código Postal" placeholder="7500000" required value={shippingData.zipCode} onChange={(e) => setShippingData({...shippingData, zipCode: e.target.value})} />
                    <Input label="País" placeholder="Chile" required value={shippingData.country} onChange={(e) => setShippingData({...shippingData, country: e.target.value})} />
                  </div>
                  <Button onClick={() => setStep('payment')} fullWidth size="lg">
                    Continuar al Pago
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Información de Pago */}
            {step === 'payment' && (
              <Card>
                <CardHeader>
                  <CardTitle>Información de Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-[#00e676]/10 border border-[#00e676]/20 rounded-lg mb-4">
                    <Lock className="w-4 h-4 text-[#00e676]" />
                    <span className="text-sm text-[#00e676]">Pago seguro procesado por Getnet</span>
                  </div>

                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span className="text-foreground">
                        Tarjeta de Crédito / Débito
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Serás redirigido a una página segura para completar tu compra.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('shipping')} fullWidth>
                      Volver
                    </Button>
                    <Button onClick={() => setStep('review')} fullWidth size="lg">
                      Revisar Pedido
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Revisar Pedido */}
            {step === 'review' && (
              <Card>
                <CardHeader>
                  <CardTitle>Revisa tu Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-2">
                      Dirección de Envío
                    </h3>
                    <p className="text-sm text-foreground">
                      {shippingData.firstName} {shippingData.lastName}<br />
                      {shippingData.address}<br />
                      {shippingData.city}, {shippingData.state} {shippingData.zipCode}<br />
                      {shippingData.country}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm text-muted-foreground mb-2">
                      Método de Pago
                    </h3>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground">
                        Getnet Checkout Seguro
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('payment')} fullWidth disabled={isProcessing}>
                      Volver
                    </Button>
                    <Button fullWidth size="lg" onClick={handlePlaceOrder} disabled={isProcessing}>
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Procesando...
                        </>
                      ) : (
                        'Confirmar Pedido'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Resumen del Pedido */}
          <div>
            <CheckoutSummary items={checkoutItems} />
          </div>
        </div>
      </div>
  );
}
