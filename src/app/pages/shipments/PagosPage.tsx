import { useState, useMemo } from 'react';
import { CreditCard, CheckCircle } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input, Select } from '../../components/design-system/Input';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { EmptyState } from '../../components/design-system/EmptyState';

export default function PagosPage() {
  const { boletas, config, confirmPayment } = useShipmentsData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cuenta, setCuenta] = useState('');
  const [fechaTransf, setFechaTransf] = useState(new Date().toISOString().split('T')[0]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const pendientes = useMemo(
    () => boletas.filter((b) => b.estado === 'sin_pagar'),
    [boletas],
  );

  const selected = useMemo(
    () => pendientes.find((b) => b.id === selectedId) || null,
    [pendientes, selectedId],
  );

  function handleConfirm() {
    if (!selectedId) return;
    confirmPayment(selectedId);
    setSuccessMsg(`Pago confirmado para boleta ${selectedId}`);
    setSelectedId(null);
    setCuenta('');
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Confirmar Pagos</h2>

      {successMsg && (
        <Card padding="sm" className="border-[#00e676]/30 bg-[#00e676]/10">
          <div className="flex items-center gap-2 text-[#00e676]">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        </Card>
      )}

      {pendientes.length === 0 ? (
        <Card>
          <EmptyState
            icon={CreditCard}
            title="Sin pagos pendientes"
            description="Todas las boletas han sido pagadas."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice list */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Boletas sin pagar ({pendientes.length})
            </p>
            {pendientes.map((b) => (
              <Card
                key={b.id}
                padding="sm"
                className={`cursor-pointer transition-all ${
                  selectedId === b.id
                    ? 'border-primary/50 bg-primary/5'
                    : 'hover:border-primary/20'
                }`}
                onClick={() => setSelectedId(b.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-sm font-medium">{b.id}</p>
                    <p className="text-xs text-muted-foreground">{b.fecha} · {b.productos} productos</p>
                  </div>
                  <div className="text-right">
                    <PriceDisplay amount={b.totalCLP} currency="CLP" className="text-lg" />
                    <div className="mt-1"><StatusBadge status={b.estado} /></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Payment form */}
          <div>
            {selected ? (
              <Card>
                <CardHeader>
                  <CardTitle>Confirmar Pago — {selected.id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-secondary/50 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total ¥:</span>
                        <PriceDisplay amount={selected.totalJPY} currency="JPY" />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">TC:</span>
                        <span className="font-[family-name:var(--font-mono)]">{selected.tc}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-muted-foreground">Total CLP:</span>
                        <PriceDisplay amount={selected.totalCLP} currency="CLP" />
                      </div>
                    </div>

                    <Select
                      label="Cuenta Bancaria"
                      value={cuenta}
                      onChange={(e) => setCuenta(e.target.value)}
                    >
                      <option value="">Seleccionar cuenta...</option>
                      {config.cuentas.map((c, i) => (
                        <option key={i} value={c.titular}>
                          {c.titular} — {c.banco} {c.numero}
                        </option>
                      ))}
                    </Select>

                    <Input
                      label="Fecha Transferencia"
                      type="date"
                      value={fechaTransf}
                      onChange={(e) => setFechaTransf(e.target.value)}
                    />

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Monto CLP</p>
                      <PriceDisplay amount={selected.totalCLP} currency="CLP" className="text-2xl" />
                    </div>

                    <Button fullWidth onClick={handleConfirm}>
                      <CheckCircle className="w-4 h-4" /> Confirmar Pago
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center min-h-[300px]">
                <p className="text-muted-foreground text-sm">
                  Selecciona una boleta para confirmar el pago
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
