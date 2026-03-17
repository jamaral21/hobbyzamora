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
    address: '', city: '', state: '', zipCode: '', country: 'United States'
  });
  const navigate = useNavigate();
  const { items: cartItems, clearCart, getSubtotal } = useCartStore();

  // Pre-fill shipping data from authenticated user
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

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) return;
    setIsProcessing(true);
    try {
      // Create the order with proper data mapping
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
      
      // Use unified checkout endpoint (dev: auto-approve, prod: Getnet)
      const payment = await paymentsAPI.checkout(order.id);
      
      if (payment.checkoutUrl) {
        // Production: redirect to Getnet
        window.location.href = payment.checkoutUrl;
      } else {
        // Development: payment auto-approved
        clearCart();
        navigate(`/store/order-confirmation?orderId=${order.id}`);
      }
    } catch (error: any) {
      console.error('Checkout failed:', error);
      alert(error?.message || 'Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-8">Checkout</h1>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {['shipping', 'payment', 'review'].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  step === s
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                }`}
              >
                {idx + 1}
              </div>
              {idx < 2 && (
                <div className="w-12 h-0.5 bg-gray-200 dark:bg-gray-800 mx-2" />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Information */}
            {step === 'shipping' && (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name" placeholder="John" required value={shippingData.firstName} onChange={(e) => setShippingData({...shippingData, firstName: e.target.value})} />
                    <Input label="Last Name" placeholder="Doe" required value={shippingData.lastName} onChange={(e) => setShippingData({...shippingData, lastName: e.target.value})} />
                  </div>
                  <Input label="Email" type="email" placeholder="john@example.com" required value={shippingData.email} onChange={(e) => setShippingData({...shippingData, email: e.target.value})} />
                  <Input label="Phone" type="tel" placeholder="+1 (555) 123-4567" required value={shippingData.phone} onChange={(e) => setShippingData({...shippingData, phone: e.target.value})} />
                  <Input label="Address" placeholder="123 Main St" required value={shippingData.address} onChange={(e) => setShippingData({...shippingData, address: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="City" placeholder="New York" required value={shippingData.city} onChange={(e) => setShippingData({...shippingData, city: e.target.value})} />
                    <Input label="State" placeholder="NY" required value={shippingData.state} onChange={(e) => setShippingData({...shippingData, state: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="ZIP Code" placeholder="10001" required value={shippingData.zipCode} onChange={(e) => setShippingData({...shippingData, zipCode: e.target.value})} />
                    <Input label="Country" placeholder="United States" required value={shippingData.country} onChange={(e) => setShippingData({...shippingData, country: e.target.value})} />
                  </div>
                  <Button onClick={() => setStep('payment')} fullWidth size="lg">
                    Continue to Payment
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Payment Information */}
            {step === 'payment' && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
                    <Lock className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Secure payment processing via Getnet</span>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                      <span className="text-gray-900 dark:text-gray-100">
                        Credit / Debit Card
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You will be redirected to a secure payment page to complete your purchase.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('shipping')} fullWidth>
                      Back
                    </Button>
                    <Button onClick={() => setStep('review')} fullWidth size="lg">
                      Review Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Review Order */}
            {step === 'review' && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Your Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Shipping Address
                    </h3>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {shippingData.firstName} {shippingData.lastName}<br />
                      {shippingData.address}<br />
                      {shippingData.city}, {shippingData.state} {shippingData.zipCode}<br />
                      {shippingData.country}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method
                    </h3>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        Getnet Secure Checkout
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('payment')} fullWidth disabled={isProcessing}>
                      Back
                    </Button>
                    <Button fullWidth size="lg" onClick={handlePlaceOrder} disabled={isProcessing}>
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        'Place Order'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <CheckoutSummary items={checkoutItems} />
          </div>
        </div>
      </div>
  );
}
