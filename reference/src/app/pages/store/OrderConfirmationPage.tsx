import { Link } from 'react-router';
import { CheckCircle, Package, Download } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { Card, CardContent } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';

export default function OrderConfirmationPage() {
  const orderNumber = 'ORD-2026-12345';
  const email = 'customer@example.com';

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
              Thank you for your purchase. We've sent a confirmation email to {email}
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Order Number</p>
              <p className="text-2xl text-gray-900 dark:text-gray-100">{orderNumber}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                <Package className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                  Estimated Delivery
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  March 15-17, 2026
                </p>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
                <Download className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                  Download Receipt
                </h3>
                <button className="text-sm text-purple-600 hover:text-purple-700">
                  Download PDF
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <Link to="/store/orders">
                <Button fullWidth size="lg">View Order Details</Button>
              </Link>
              <Link to="/store/products">
                <Button fullWidth variant="outline">Continue Shopping</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </StoreLayout>
  );
}
