import { Trash2 } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';

interface POSCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface POSCartProps {
  items: POSCartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onClear: () => void;
}

export function POSCart({ items, onUpdateQuantity, onRemove, onCheckout, onClear }: POSCartProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Card className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl text-gray-900 dark:text-gray-100">Current Sale</h2>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear All
        </Button>
      </div>

      <div className="flex-1 overflow-auto space-y-3 mb-4">
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No items in cart</p>
            <p className="text-sm mt-1">Scan or search products to add</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-gray-100">{item.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ${item.price.toFixed(2)} × {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 text-center rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
                <span className="text-gray-900 dark:text-gray-100 min-w-[60px] text-right">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
                <button
                  onClick={() => onRemove(item.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-2xl text-gray-900 dark:text-gray-100">Total</span>
          <span className="text-3xl text-gray-900 dark:text-gray-100">
            ${total.toFixed(2)}
          </span>
        </div>

        <Button
          fullWidth
          size="lg"
          onClick={onCheckout}
          disabled={items.length === 0}
        >
          Checkout
        </Button>
      </div>
    </Card>
  );
}
