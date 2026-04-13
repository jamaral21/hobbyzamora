import { useState } from 'react';
import { FileText } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { EmptyState } from '../../components/design-system/EmptyState';

export default function GAVChilePage() {
  const { gavChile, confirmGAV } = useShipmentsData();
  const [errorId, setErrorId] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  function handleToggleAdjunto(id: number) {
    // We simulate toggling adjunto by directly mutating the gavChile state
    // Since the context doesn't expose a toggleAdjunto, we work with the local UI state
    // The adjunto field is toggled in-place via the context's gavChile array
    // For now, we use a local override map
    setAdjuntoOverrides((prev) => {
      const current = prev[id] ?? gavChile.find((g) => g.id === id)?.adjunto ?? false;
      return { ...prev, [id]: !current };
    });
    // Clear error if toggling on
    if (errorId === id) setErrorId(null);
  }

  // Local adjunto overrides (simulating upload toggle)
  const [adjuntoOverrides, setAdjuntoOverrides] = useState<Record<number, boolean>>({});

  function getAdjunto(id: number): boolean {
    if (id in adjuntoOverrides) return adjuntoOverrides[id];
    return gavChile.find((g) => g.id === id)?.adjunto ?? false;
  }

  function handleConfirm(id: number) {
    if (!getAdjunto(id)) {
      setErrorId(id);
      setToastMsg('Debe adjuntar comprobante antes de confirmar');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    setErrorId(null);
    confirmGAV(id);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Gastos Fijos Chile</h2>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-destructive/90 text-destructive-foreground px-4 py-3 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      {/* Table */}
      <Card padding="none">
        {gavChile.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin gastos fijos"
            description="No hay gastos fijos registrados para Chile."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Comprobante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Pago</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gavChile.map((g) => {
                const adjunto = getAdjunto(g.id);
                const hasError = errorId === g.id;

                return (
                  <TableRow key={g.id}>
                    <TableCell>{g.concepto}</TableCell>
                    <TableCell className="text-right">
                      <PriceDisplay amount={g.monto} currency="CLP" />
                    </TableCell>
                    <TableCell className="text-center">
                      {g.estado === 'pagado' ? (
                        <span className="text-[#00e676] text-lg">✓</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleAdjunto(g.id)}
                          className={`text-lg cursor-pointer px-3 py-1 rounded transition-colors ${
                            hasError
                              ? 'border border-destructive bg-destructive/10'
                              : 'hover:bg-secondary'
                          }`}
                        >
                          {adjunto ? (
                            <span className="text-[#00e676]">✓</span>
                          ) : (
                            <span className="text-muted-foreground">✗</span>
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={g.estado} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {g.fechaPago || '—'}
                    </TableCell>
                    <TableCell>
                      {g.estado === 'pendiente' && (
                        <Button size="sm" variant="outline" onClick={() => handleConfirm(g.id)}>
                          Confirmar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
