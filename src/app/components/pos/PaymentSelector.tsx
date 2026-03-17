import { CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { clsx } from 'clsx';

export type PaymentMethod = 'card' | 'cash' | 'digital';

export interface PaymentSelectorProps {
  total: number;
  onSelectPayment: (method: PaymentMethod) => void;
  onCancel: () => void;
}

export function PaymentSelector({ total, onSelectPayment, onCancel }: PaymentSelectorProps) {
  const paymentMethods = [
    { id: 'card' as PaymentMethod, label: 'Card', icon: CreditCard },
    { id: 'cash' as PaymentMethod, label: 'Cash', icon: Banknote },
    { id: 'digital' as PaymentMethod, label: 'Digital Wallet', icon: Smartphone },
  ];

  return (
    <Card>
      <div className="text-center mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Total Amount</p>
        <p className="text-4xl text-gray-900 dark:text-gray-100">${total.toFixed(2)}</p>
      </div>

      <div className="space-y-3 mb-6">
        <p className="text-sm text-gray-700 dark:text-gray-300">Select Payment Method</p>
        <div className="grid grid-cols-1 gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => onSelectPayment(method.id)}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-600 border border-transparent transition-all"
              >
                <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-gray-900 dark:text-gray-100">{method.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="outline" fullWidth onClick={onCancel}>
        Cancel
      </Button>
    </Card>
  );
}
