import { useState } from 'react';
import { CreditCard, Banknote, Smartphone, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';

export type PaymentMethod = 'card' | 'cash' | 'digital';

export interface PaymentSelectorProps {
  total: number;
  onSelectPayment: (method: PaymentMethod, amountPaid?: number) => void;
  onCancel: () => void;
}

export function PaymentSelector({ total, onSelectPayment, onCancel }: PaymentSelectorProps) {
  const [step, setStep] = useState<'method' | 'cash'>('method');
  const [amountPaid, setAmountPaid] = useState('');

  const fmt = (n: number) => n.toLocaleString('es-CL', { minimumFractionDigits: 0 });

  const parsedAmount = parseFloat(amountPaid.replace(/\./g, '').replace(',', '.')) || 0;
  const change = parsedAmount > 0 ? parsedAmount - total : 0;
  const cashIsValid = parsedAmount >= total;

  const paymentMethods = [
    { id: 'cash' as PaymentMethod, label: 'Efectivo', icon: Banknote, hint: 'Pago en billetes/monedas' },
    { id: 'card' as PaymentMethod, label: 'Tarjeta', icon: CreditCard, hint: 'Débito o crédito' },
    { id: 'digital' as PaymentMethod, label: 'Transferencia / Digital', icon: Smartphone, hint: 'Transferencia bancaria' },
  ];

  if (step === 'cash') {
    return (
      <Card>
        <button
          onClick={() => { setStep('method'); setAmountPaid(''); }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-1">Total a cobrar</p>
          <p className="text-4xl text-foreground">${fmt(total)}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Monto recibido ($)</label>
            <input
              type="number"
              min={0}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={`Mínimo $${fmt(total)}`}
              className="w-full px-4 py-3 text-2xl rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
              autoFocus
            />
          </div>

          {parsedAmount > 0 && (
            <div className={`rounded-lg p-4 text-center ${cashIsValid ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              {cashIsValid ? (
                <>
                  <p className="text-sm text-muted-foreground">Vuelto</p>
                  <p className="text-3xl text-green-500">${fmt(change)}</p>
                </>
              ) : (
                <p className="text-sm text-red-500">Monto insuficiente (faltan ${fmt(total - parsedAmount)})</p>
              )}
            </div>
          )}

          {/* Quick amount buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[1000, 2000, 5000, 10000, 20000, 50000].map(amt => (
              <button
                key={amt}
                onClick={() => setAmountPaid(String(amt))}
                className="py-2 px-3 text-sm bg-secondary rounded-lg hover:bg-primary/10 hover:text-primary transition-colors border border-border"
              >
                ${fmt(amt)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Button
            fullWidth
            disabled={!cashIsValid}
            onClick={() => onSelectPayment('cash', parsedAmount)}
            className="flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar Pago en Efectivo
          </Button>
          <Button variant="outline" fullWidth onClick={onCancel}>Cancelar</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground mb-2">Total a cobrar</p>
        <p className="text-4xl text-foreground">${fmt(total)}</p>
      </div>

      <div className="space-y-3 mb-6">
        <p className="text-sm text-muted-foreground">Selecciona método de pago</p>
        <div className="grid grid-cols-1 gap-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => {
                  if (method.id === 'cash') {
                    setStep('cash');
                  } else {
                    onSelectPayment(method.id);
                  }
                }}
                className="flex items-center gap-4 p-4 bg-secondary rounded-lg hover:bg-primary/10 hover:border-primary border border-transparent transition-all text-left"
              >
                <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-foreground">{method.label}</p>
                  <p className="text-xs text-muted-foreground">{method.hint}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="outline" fullWidth onClick={onCancel}>Cancelar</Button>
    </Card>
  );
}

