import { Trash2, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
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
      <h2 className="text-xl text-foreground mb-6">Carrito de Compras</h2>

      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 pb-4 border-b border-border last:border-0">
            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="text-sm text-foreground">{item.name}</h3>
              {item.variant && (
                <p className="text-xs text-muted-foreground mt-1">{item.variant}</p>
              )}
              <p className="text-sm text-primary font-bold font-[family-name:var(--font-mono)] mt-2">
                ${item.price.toLocaleString('es-CL')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => onRemove(item.id)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 border border-border rounded-lg">
                <button
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  className="p-1 hover:bg-secondary transition-colors"
                  aria-label="Reducir cantidad"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm w-8 text-center font-[family-name:var(--font-mono)]">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="p-1 hover:bg-secondary transition-colors"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-4 border-t border-border">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-foreground font-[family-name:var(--font-mono)]">${subtotal.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Envío</span>
          <span className="text-foreground font-[family-name:var(--font-mono)]">${shipping.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Impuesto</span>
          <span className="text-foreground font-[family-name:var(--font-mono)]">${tax.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-border">
          <span className="text-foreground font-semibold">Total</span>
          <span className="text-xl text-primary font-bold font-[family-name:var(--font-mono)]">${total.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <Link to="/store/checkout">
        <Button fullWidth size="lg" className="mt-6">
          Ir al Checkout
        </Button>
      </Link>
    </Card>
  );
}
