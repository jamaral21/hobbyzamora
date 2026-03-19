import { CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';

export type PaymentMethod = 'card' | 'cash' | 'digital';

export interface PaymentSelectorProps {
  total: number;
  onSelectPayment: (method: PaymentMethod) => void;
  onCancel: () => void;
}

export function PaymentSelector({ total, onSelectPayment, onCancel }: PaymentSelectorProps) {
  const paymentMethods = [
    { id: 'card' as PaymentMethod, label: 'Tarjeta', icon: CreditCard },
    { id: 'cash' as PaymentMethod, label: 'Efectivo', icon: Banknote },
    { id: 'digital' as PaymentMethod, label: 'Billetera Digital', icon: Smartphone },
  ];

  return (
    <Card>
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground mb-2">Monto Total</p>
        <p className="text-4xl text-foreground">${total.toLocaleString('es-CL', { minimumFractionDigits: 2 })}</p>
      </div>

      <div className="space-y-3 mb-6">
        <p className="text-sm text-muted-foreground">Selecciona método de pago</p>
        <div className="grid grid-cols-1 gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => onSelectPayment(method.id)}
                className="flex items-center gap-4 p-4 bg-secondary rounded-lg hover:bg-primary/10 hover:border-primary border border-transparent transition-all"
              >
                <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-foreground">{method.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="outline" fullWidth onClick={onCancel}>
        Cancelar
      </Button>
    </Card>
  );
}
