import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { CheckoutSummary } from '../../components/store/CheckoutSummary';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Input } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import { CreditCard, Lock, Loader2, MapPin, ShieldCheck, ChevronRight, AlertCircle, Wallet, Landmark } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { ordersAPI, paymentsAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { RequireAuth } from '../../components/auth/RequireAuth';

type PaymentMethodType = NonNullable<Parameters<typeof paymentsAPI.checkout>[1]>;

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
  const [checkoutCompleted, setCheckoutCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('credit');
  const [shippingErrors, setShippingErrors] = useState<Record<string, string>>({});
  const [shippingData, setShippingData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zipCode: '', country: 'México'
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

  // Redirect to cart if empty
  useEffect(() => {
    if (cartItems.length === 0 && !isProcessing && !checkoutCompleted) {
      navigate('/store/cart');
    }
  }, [cartItems.length, isProcessing, checkoutCompleted, navigate]);

  const checkoutItems = cartItems.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    variant: item.variant
  }));

  const stepLabels = { shipping: 'Envío', payment: 'Pago', review: 'Revisión' };
  const steps: Array<'shipping' | 'payment' | 'review'> = ['shipping', 'payment', 'review'];

  const validateShipping = (): boolean => {
    const errors: Record<string, string> = {};
    if (!shippingData.firstName.trim()) errors.firstName = 'Nombre requerido';
    if (!shippingData.lastName.trim()) errors.lastName = 'Apellido requerido';
    if (!shippingData.email.trim()) errors.email = 'Email requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingData.email)) errors.email = 'Email inválido';
    if (!shippingData.phone.trim()) errors.phone = 'Teléfono requerido';
    if (!shippingData.address.trim()) errors.address = 'Dirección requerida';
    if (!shippingData.city.trim()) errors.city = 'Ciudad requerida';
    if (!shippingData.state.trim()) errors.state = 'Estado/Región requerido';
    if (!shippingData.zipCode.trim()) errors.zipCode = 'Código postal requerido';
    if (!shippingData.country.trim()) errors.country = 'País requerido';
    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goToPayment = () => {
    if (validateShipping()) {
      setStep('payment');
    }
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const order = await ordersAPI.create({
        items: cartItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          ...(item.variantId ? { variantId: item.variantId } : {}),
        })),
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
        paymentMethod,
      });
      
      const payment = await paymentsAPI.checkout(order.id, paymentMethod);
      
      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
      } else {
        setCheckoutCompleted(true);
        clearCart();
        navigate(`/store/order-confirmation?orderId=${order.id}`);
      }
    } catch (err: any) {
      console.error('Error en checkout:', err);
      setError(err?.message || 'Error al procesar el pedido. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setShippingData(prev => ({ ...prev, [field]: value }));
    if (shippingErrors[field]) {
      setShippingErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-primary mb-8">CHECKOUT</h1>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {steps.map((s, idx) => {
            const isCompleted = steps.indexOf(step) > idx;
            const isCurrent = step === s;
            return (
              <div key={s} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-[family-name:var(--font-mono)] transition-colors ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : isCompleted
                        ? 'bg-[#00e676] text-black'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {stepLabels[s]}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`w-12 h-0.5 mx-2 transition-colors ${isCompleted ? 'bg-[#00e676]' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Información de Envío */}
            {step === 'shipping' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <CardTitle>Dirección de Envío</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input label="Nombre *" placeholder="Juan" value={shippingData.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
                      {shippingErrors.firstName && <p className="text-xs text-red-400 mt-1">{shippingErrors.firstName}</p>}
                    </div>
                    <div>
                      <Input label="Apellido *" placeholder="Pérez" value={shippingData.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
                      {shippingErrors.lastName && <p className="text-xs text-red-400 mt-1">{shippingErrors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <Input label="Email *" type="email" placeholder="tu@email.com" value={shippingData.email} onChange={(e) => updateField('email', e.target.value)} />
                    {shippingErrors.email && <p className="text-xs text-red-400 mt-1">{shippingErrors.email}</p>}
                  </div>
                  <div>
                    <Input label="Teléfono *" type="tel" placeholder="+52 55 1234 5678" value={shippingData.phone} onChange={(e) => updateField('phone', e.target.value)} />
                    {shippingErrors.phone && <p className="text-xs text-red-400 mt-1">{shippingErrors.phone}</p>}
                  </div>
                  <div>
                    <Input label="Dirección *" placeholder="Calle Principal 123, Col. Centro" value={shippingData.address} onChange={(e) => updateField('address', e.target.value)} />
                    {shippingErrors.address && <p className="text-xs text-red-400 mt-1">{shippingErrors.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input label="Ciudad *" placeholder="Ciudad de México" value={shippingData.city} onChange={(e) => updateField('city', e.target.value)} />
                      {shippingErrors.city && <p className="text-xs text-red-400 mt-1">{shippingErrors.city}</p>}
                    </div>
                    <div>
                      <Input label="Estado *" placeholder="CDMX" value={shippingData.state} onChange={(e) => updateField('state', e.target.value)} />
                      {shippingErrors.state && <p className="text-xs text-red-400 mt-1">{shippingErrors.state}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input label="Código Postal *" placeholder="06600" value={shippingData.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} />
                      {shippingErrors.zipCode && <p className="text-xs text-red-400 mt-1">{shippingErrors.zipCode}</p>}
                    </div>
                    <div>
                      <Input label="País *" placeholder="México" value={shippingData.country} onChange={(e) => updateField('country', e.target.value)} />
                      {shippingErrors.country && <p className="text-xs text-red-400 mt-1">{shippingErrors.country}</p>}
                    </div>
                  </div>
                  <Button onClick={goToPayment} fullWidth size="lg">
                    Continuar al Pago <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Método de Pago */}
            {step === 'payment' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <CardTitle>Método de Pago</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-[#00e676]/10 border border-[#00e676]/20 rounded-lg">
                    <Lock className="w-4 h-4 text-[#00e676]" />
                    <span className="text-sm text-[#00e676]">Tarjetas procesadas de forma segura por Getnet</span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Selecciona tu método de pago:
                  </p>

                  {/* Tarjeta de Crédito */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'credit'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'credit' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {paymentMethod === 'credit' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <span className="text-foreground font-medium">Tarjeta de Crédito</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Visa, Mastercard, American Express</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white italic">VISA</span>
                        </div>
                        <div className="w-8 h-5 bg-[#EB001B] rounded flex items-center justify-center relative overflow-hidden">
                          <div className="absolute left-1 w-3 h-3 rounded-full bg-[#EB001B] opacity-90" />
                          <div className="absolute right-1 w-3 h-3 rounded-full bg-[#F79E1B] opacity-90" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Tarjeta de Débito */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('debit')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'debit'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'debit' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {paymentMethod === 'debit' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <span className="text-foreground font-medium">Tarjeta de Débito</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Visa Débito, Mastercard Débito</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white italic">VISA</span>
                        </div>
                        <div className="w-8 h-5 bg-[#EB001B] rounded flex items-center justify-center relative overflow-hidden">
                          <div className="absolute left-1 w-3 h-3 rounded-full bg-[#EB001B] opacity-90" />
                          <div className="absolute right-1 w-3 h-3 rounded-full bg-[#F79E1B] opacity-90" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Transferencia */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'transfer' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {paymentMethod === 'transfer' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <span className="text-foreground font-medium">Transferencia Bancaria</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Un admin confirma manualmente el pago</p>
                        </div>
                      </div>
                      <Landmark className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>

                  {/* Efectivo */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-secondary hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'cash' ? 'border-primary' : 'border-muted-foreground'
                        }`}>
                          {paymentMethod === 'cash' && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <div>
                          <span className="text-foreground font-medium">Pago en Efectivo</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Tu orden queda pendiente de validación</p>
                        </div>
                      </div>
                      <Wallet className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>

                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      {paymentMethod === 'credit' || paymentMethod === 'debit'
                        ? 'Al continuar serás redirigido a la pasarela segura de Getnet para ingresar los datos de tu tarjeta. No almacenamos información de tu tarjeta.'
                        : 'Tu orden será recibida y validada manualmente. Te notificaremos cuando el pago quede confirmado y el pedido comience a procesarse.'}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep('shipping')} fullWidth>
                      Volver
                    </Button>
                    <Button onClick={() => setStep('review')} fullWidth size="lg">
                      Revisar Pedido <ChevronRight className="w-4 h-4 ml-1" />
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
                  {/* Dirección de Envío */}
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" />
                        Dirección de Envío
                      </h3>
                      <button
                        type="button"
                        onClick={() => setStep('shipping')}
                        className="text-xs text-primary hover:underline"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="text-sm text-foreground">
                      {shippingData.firstName} {shippingData.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {shippingData.address}<br />
                      {shippingData.city}, {shippingData.state} {shippingData.zipCode}<br />
                      {shippingData.country}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {shippingData.email} · {shippingData.phone}
                    </p>
                  </div>

                  {/* Método de Pago */}
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-primary" />
                        Método de Pago
                      </h3>
                      <button
                        type="button"
                        onClick={() => setStep('payment')}
                        className="text-xs text-primary hover:underline"
                      >
                        Cambiar
                      </button>
                    </div>
                    <p className="text-sm text-foreground">
                      {paymentMethod === 'credit' && 'Tarjeta de Crédito'}
                      {paymentMethod === 'debit' && 'Tarjeta de Débito'}
                      {paymentMethod === 'transfer' && 'Transferencia Bancaria'}
                      {paymentMethod === 'cash' && 'Pago en Efectivo'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {paymentMethod === 'credit' || paymentMethod === 'debit'
                        ? 'Procesado de forma segura por Getnet'
                        : 'Confirmación manual por administración'}
                    </p>
                  </div>

                  {/* Items del pedido */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">
                      Artículos ({cartItems.length})
                    </h3>
                    <div className="divide-y divide-border">
                      {cartItems.map(item => (
                        <div key={item.id} className="flex items-center gap-3 py-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded-md object-cover bg-secondary"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{item.name}</p>
                            {item.variant && (
                              <p className="text-xs text-muted-foreground">{item.variant}</p>
                            )}
                            <p className="text-xs text-muted-foreground">Cant: {item.quantity}</p>
                          </div>
                          <span className="text-sm text-foreground font-[family-name:var(--font-mono)]">
                            ${(item.price * item.quantity).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
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
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          {paymentMethod === 'credit' || paymentMethod === 'debit'
                            ? 'Pagar con Getnet'
                            : 'Confirmar Pedido'}
                        </>
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
