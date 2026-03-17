import { useState } from 'react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { CheckoutSummary } from '../../components/store/CheckoutSummary';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Input } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import { CreditCard, Lock } from 'lucide-react';

export default function CheckoutPage() {
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');

  const checkoutItems = [
    { id: '1', name: 'Premium Watercolor Set', quantity: 1, price: 49.99, variant: '24 colors' },
    { id: '2', name: 'Calligraphy Starter Kit', quantity: 2, price: 34.99 },
    { id: '5', name: 'Professional Sketch Pencils', quantity: 1, price: 18.99 },
  ];

  return (
    <StoreLayout>
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
                    <Input label="First Name" placeholder="John" required />
                    <Input label="Last Name" placeholder="Doe" required />
                  </div>
                  <Input label="Email" type="email" placeholder="john@example.com" required />
                  <Input label="Phone" type="tel" placeholder="+1 (555) 123-4567" required />
                  <Input label="Address" placeholder="123 Main St" required />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="City" placeholder="New York" required />
                    <Input label="State" placeholder="NY" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="ZIP Code" placeholder="10001" required />
                    <Input label="Country" placeholder="United States" required />
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
                    <span className="text-sm text-green-600">Secure payment processing</span>
                  </div>

                  <Input
                    label="Card Number"
                    placeholder="1234 5678 9012 3456"
                    required
                  />
                  <Input
                    label="Cardholder Name"
                    placeholder="John Doe"
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Expiry Date" placeholder="MM/YY" required />
                    <Input label="CVV" placeholder="123" required />
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
                      John Doe<br />
                      123 Main St<br />
                      New York, NY 10001<br />
                      United States
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method
                    </h3>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        •••• •••• •••• 3456
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('payment')} fullWidth>
                      Back
                    </Button>
                    <Button fullWidth size="lg">
                      Place Order
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
    </StoreLayout>
  );
}
