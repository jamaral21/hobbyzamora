import { Link, useParams } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { CheckCircle, Package, Truck, ArrowRight } from 'lucide-react';

export function OrderConfirmationPage() {
  const { orderId } = useParams();

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">
            Thank you for your purchase. Your order has been received.
          </p>
        </div>

        {/* Order Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Order Number</p>
                <p className="font-semibold">#{orderId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Order Date</p>
                <p className="font-semibold">March 10, 2026</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="font-semibold text-purple-600">$401.47</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-semibold">•••• 3456</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Premium Action Figure Collection × 2</span>
              <span className="font-medium">$179.98</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Limited Edition Model Kit × 1</span>
              <span className="font-medium">$149.99</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Collectible Trading Cards × 1</span>
              <span className="font-medium">$34.99</span>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipping Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">
              <strong>John Doe</strong>
            </p>
            <p className="text-sm text-gray-600">
              123 Main Street<br />
              Apt 4B<br />
              New York, NY 10001<br />
              United States
            </p>
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-900">
                Estimated Delivery: March 15-17, 2026
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/products" className="flex-1">
            <Button variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </Link>
          <Link to="/" className="flex-1">
            <Button className="w-full">
              Back to Home
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Confirmation Email */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>A confirmation email has been sent to your email address.</p>
        </div>
      </div>
    </div>
  );
}
