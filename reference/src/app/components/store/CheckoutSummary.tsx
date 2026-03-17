import { Card, CardContent } from '../design-system/Card';

interface CheckoutItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variant?: string;
}

export interface CheckoutSummaryProps {
  items: CheckoutItem[];
}

export function CheckoutSummary({ items }: CheckoutSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <Card>
      <h2 className="text-lg text-gray-900 dark:text-gray-100 mb-4">Order Summary</h2>
      
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <div className="flex-1">
              <p className="text-gray-900 dark:text-gray-100">
                {item.name} <span className="text-gray-500">× {item.quantity}</span>
              </p>
              {item.variant && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.variant}</p>
              )}
            </div>
            <span className="text-gray-900 dark:text-gray-100">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}

        <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-gray-100">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Shipping</span>
            <span className="text-gray-900 dark:text-gray-100">${shipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Tax</span>
            <span className="text-gray-900 dark:text-gray-100">${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
            <span className="text-gray-900 dark:text-gray-100">Total</span>
            <span className="text-xl text-gray-900 dark:text-gray-100">${total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
