import { useState, useMemo, useEffect } from 'react';
import { CreditCard, CheckCircle, Trash2, AlertTriangle } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input, Select } from '../../components/design-system/Input';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { EmptyState } from '../../components/design-system/EmptyState';

interface PaymentAllocation {
  cuentaIndex: string;
  monto: string;
}

export default function PagosPage() {
  const { boletas, config, confirmPayment, deleteBoleta } = useShipmentsData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([{ cuentaIndex: '', monto: '' }]);
  const [fechaTransf, setFechaTransf] = useState(new Date().toISOString().split('T')[0]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const pendientes = useMemo(
    () => boletas.filter((b) => b.estado === 'sin_pagar'),
    [boletas],
  );

  const selected = useMemo(
    () => pendientes.find((b) => b.id === selectedId) || null,
    [pendientes, selectedId],
  );

  const allocationSummary = useMemo(() => {
    if (!selected) {
      return {
        totalAssigned: 0,
        remaining: 0,
        isValid: false,
        normalized: [] as Array<{ cuenta: string; montoCLP: number }>,
      };
    }

    const normalized = allocations
      .map((entry) => {
        const idx = Number(entry.cuentaIndex);
        const account = Number.isInteger(idx) ? config.cuentas[idx] : undefined;
        const amount = Number(entry.monto);

        if (!account || !Number.isFinite(amount) || amount <= 0) {
          return null;
        }

        return {
          cuenta: `${account.titular} — ${account.banco} ${account.numero}`,
          montoCLP: Math.round(amount),
        };
      })
      .filter((entry): entry is { cuenta: string; montoCLP: number } => entry !== null);

    const totalAssigned = normalized.reduce((sum, item) => sum + item.montoCLP, 0);
    const remaining = selected.totalCLP - totalAssigned;
    const isValid = normalized.length > 0 && Math.abs(remaining) < 1;

    return {
      totalAssigned,
      remaining,
      isValid,
      normalized,
    };
  }, [allocations, config.cuentas, selected]);

  useEffect(() => {
    setAllocations([{ cuentaIndex: '', monto: '' }]);
  }, [selectedId]);

  const addAllocationRow = () => {
    setAllocations((prev) => [...prev, { cuentaIndex: '', monto: '' }]);
  };

  const updateAllocationRow = (idx: number, patch: Partial<PaymentAllocation>) => {
    setAllocations((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeAllocationRow = (idx: number) => {
    setAllocations((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  };

  function handleConfirm() {
    if (!selectedId || !selected || !allocationSummary.isValid) return;

    const cuentas = allocationSummary.normalized;
    confirmPayment(selectedId, {
      fecha: fechaTransf,
      montoCLP: selected.totalCLP,
      cuenta: cuentas.map((item) => item.cuenta).join(' + '),
      cuentas,
    });

    setSuccessMsg(`Pago confirmado para boleta ${selectedId}`);
    setSelectedId(null);
    setAllocations([{ cuentaIndex: '', monto: '' }]);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  async function handleDelete(boletaId: string) {
    const isGAV = boletaId.includes('GAV');
    setErrorMsg(null);
    try {
      await deleteBoleta(boletaId);
      if (selectedId === boletaId) {
        setSelectedId(null);
        setAllocations([{ cuentaIndex: '', monto: '' }]);
      }
      setConfirmDeleteId(null);
      const msg = isGAV
        ? `Boleta GAV ${boletaId} eliminada. Puede generarse nuevamente desde GAV Japón.`
        : `Boleta ${boletaId} eliminada. Productos revertidos a "por pagar".`;
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (error: any) {
      setConfirmDeleteId(null);
      setErrorMsg(error?.message || `No se pudo eliminar la boleta ${boletaId}`);
      setTimeout(() => setErrorMsg(null), 5000);
    }
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

      {errorMsg && (
        <Card padding="sm" className="border-destructive/30 bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">{errorMsg}</span>
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
                onClick={() => {
                  setSelectedId(b.id);
                  setConfirmDeleteId(null);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-sm font-medium">{b.id}</p>
                    <p className="text-xs text-muted-foreground">{b.fecha} · {b.productos} productos</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <PriceDisplay amount={b.totalCLP} currency="CLP" className="text-lg" />
                      <div className="mt-1"><StatusBadge status={b.estado} /></div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      {confirmDeleteId === b.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-destructive font-medium whitespace-nowrap">¿Eliminar?</span>
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="px-2 py-1 text-xs rounded bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-medium"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-secondary transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(b.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Eliminar boleta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {confirmDeleteId === b.id && (
                  <div className="mt-2 pt-2 border-t border-destructive/20 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-destructive">
                      {b.id.includes('GAV')
                        ? 'Se eliminará la boleta GAV. Podrá generarse nuevamente desde GAV Japón.'
                        : 'Los productos asociados volverán al estado "por pagar".'}
                    </p>
                  </div>
                )}
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

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Distribución por cuentas</p>
                      {allocations.map((row, idx) => (
                        <div key={`alloc-${idx}`} className="grid grid-cols-1 md:grid-cols-[1fr_160px_auto] gap-2 items-end">
                          <Select
                            label={idx === 0 ? 'Cuenta Bancaria' : 'Cuenta adicional'}
                            value={row.cuentaIndex}
                            onChange={(e) => updateAllocationRow(idx, { cuentaIndex: e.target.value })}
                          >
                            <option value="">Seleccionar cuenta...</option>
                            {config.cuentas.map((c, accountIdx) => (
                              <option key={accountIdx} value={String(accountIdx)}>
                                {c.titular} — {c.banco} {c.numero}
                              </option>
                            ))}
                          </Select>

                          <Input
                            label="Monto CLP"
                            type="number"
                            min={0}
                            step={1}
                            value={row.monto}
                            onChange={(e) => updateAllocationRow(idx, { monto: e.target.value })}
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeAllocationRow(idx)}
                            disabled={allocations.length === 1}
                          >
                            Quitar
                          </Button>
                        </div>
                      ))}

                      <div className="flex items-center justify-between">
                        <Button type="button" variant="outline" onClick={addAllocationRow}>
                          Agregar cuenta
                        </Button>
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">Asignado: {allocationSummary.totalAssigned.toLocaleString('es-CL')}</p>
                          <p className={allocationSummary.remaining === 0 ? 'text-[#00e676]' : 'text-[#ffab00]'}>
                            Restante: {allocationSummary.remaining.toLocaleString('es-CL')}
                          </p>
                        </div>
                      </div>
                    </div>

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

                    <Button fullWidth onClick={handleConfirm} disabled={!allocationSummary.isValid}>
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
