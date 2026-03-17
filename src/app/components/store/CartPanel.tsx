import { Trash2, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
}

export interface CartPanelProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

export function CartPanel({ items, onUpdateQuantity, onRemove }: CartPanelProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 9.99 : 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <Card>
      <h2 className="text-xl text-gray-900 dark:text-gray-100 mb-6">Shopping Cart</h2>

      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 dark:border-gray-800 last:border-0">
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h3 className="text-sm text-gray-900 dark:text-gray-100">{item.name}</h3>
              {item.variant && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.variant}</p>
              )}
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-2">
                ${item.price.toFixed(2)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => onRemove(item.id)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                <button
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
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

      <Link to="/store/checkout">
        <Button fullWidth size="lg" className="mt-6">
          Proceed to Checkout
        </Button>
      </Link>
    </Card>
  );
}
