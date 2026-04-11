import { Trash2, Minus, Plus } from 'lucide-react';
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
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg text-foreground">Venta Actual</h2>
          {itemCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {itemCount}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-2 mb-4">
        {items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm">No hay artículos</p>
            <p className="text-xs mt-1 opacity-70">Escanea o busca productos</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  ${item.price.toLocaleString('es-CL')} c/u
                </p>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-0 bg-background rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-8 text-center text-sm text-foreground tabular-nums">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <span className="text-sm text-foreground min-w-[56px] text-right tabular-nums">
                ${(item.price * item.quantity).toLocaleString('es-CL', { minimumFractionDigits: 2 })}
              </span>

              <button
                onClick={() => onRemove(item.id)}
                className="p-1.5 text-muted-foreground/50 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-2xl text-foreground tabular-nums">
            ${total.toLocaleString('es-CL', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <Button
          fullWidth
          size="lg"
          onClick={onCheckout}
          disabled={items.length === 0}
        >
          Continuar con orden
        </Button>
      </div>
    </Card>
  );
}
