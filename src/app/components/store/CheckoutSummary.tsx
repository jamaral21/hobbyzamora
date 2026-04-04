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
  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 0;
  const tax = itemsTotal * 19 / 119; // IVA débito (incluido en precios)
  const neto = itemsTotal - tax;
  const total = itemsTotal + shipping;

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
            <span className="text-foreground font-[family-name:var(--font-mono)]">
              ${(item.price * item.quantity).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Neto</span>
            <span className="text-foreground font-[family-name:var(--font-mono)]">${neto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA débito (19%)</span>
            <span className="text-foreground font-[family-name:var(--font-mono)]">${tax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Envío</span>
            <span className="text-foreground font-[family-name:var(--font-mono)]">{shipping === 0 ? 'Gratis' : `$${shipping.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="text-foreground font-semibold">Total</span>
            <span className="text-xl text-primary font-bold font-[family-name:var(--font-mono)]">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
