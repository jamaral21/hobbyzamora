import { Card, CardContent } from '../design-system/Card';

interface CheckoutItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  variant?: string;
}

export interface CheckoutSummaryProps {
  items: CheckoutItem[];
}

export function CheckoutSummary({ items }: CheckoutSummaryProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.originalPrice ?? item.price) * item.quantity, 0);
  const discount = subtotal - total;
  const taxIncluded = total * 19 / 119;

  return (
    <Card>
      <h2 className="text-lg text-foreground mb-4">Resumen del Pedido</h2>
      
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <div className="flex-1">
              <p className="text-foreground">
                {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
              </p>
              {item.variant && (
                <p className="text-xs text-muted-foreground">{item.variant}</p>
              )}
            </div>
            <span className="text-right text-foreground font-[family-name:var(--font-mono)]">
              {item.originalPrice != null && item.originalPrice > item.price && (
                <span className="block text-xs text-muted-foreground line-through">
                  ${(item.originalPrice * item.quantity).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </span>
              )}
              ${(item.price * item.quantity).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </span>
          </div>
        ))}

        <div className="pt-3 border-t border-border space-y-2">
          {discount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground font-[family-name:var(--font-mono)]">${subtotal.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Descuento</span>
                <span className="text-emerald-600 font-[family-name:var(--font-mono)]">-${discount.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA incluido (19%)</span>
            <span className="text-foreground font-[family-name:var(--font-mono)]">${taxIncluded.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Envío</span>
            <span className="text-muted-foreground italic">Por calcular</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-foreground font-semibold">Total</span>
            <span className="text-xl text-primary font-bold font-[family-name:var(--font-mono)]">${total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
