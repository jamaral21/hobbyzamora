import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Trash2 } from 'lucide-react';
import { Card } from '../ui/card';

interface POSCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface POSCartProps {
  items: POSCartItem[];
  onRemoveItem?: (id: string) => void;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onClear?: () => void;
}

export function POSCart({ items, onRemoveItem, onUpdateQuantity, onClear }: POSCartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <Card className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Current Order</h3>
        {items.length > 0 && (
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear All
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No items in cart</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">
                  ${item.price.toFixed(2)} × {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-lg">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem?.(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <>
          <Separator className="mb-4" />
          
          <div className="space-y-3">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">Tax (10%)</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-2xl font-semibold">
              <span>Total</span>
              <span className="text-purple-600">${total.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
