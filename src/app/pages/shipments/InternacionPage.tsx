import { useState, useMemo } from 'react';
import { FileText, Save } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { EmptyState } from '../../components/design-system/EmptyState';
import { Badge } from '../../components/design-system/Badge';

export default function InternacionPage() {
  const { cajas, saveInternacion } = useShipmentsData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [arancel, setArancel] = useState('');
  const [iva, setIva] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Only show boxes with estado transito or llegada
  const eligibleBoxes = useMemo(
    () => cajas.filter(b => b.estado === 'transito' || b.estado === 'llegada'),
    [cajas],
  );

  const selectedBox = useMemo(
    () => eligibleBoxes.find(b => b.id === selectedId) || null,
    [eligibleBoxes, selectedId],
  );

  const handleSelect = (id: string) => {
    const box = eligibleBoxes.find(b => b.id === id);
    setSelectedId(id);
    setErrors({});
    if (box?.internacion) {
      setArancel(String(box.internacion.arancel));
      setIva(String(box.internacion.iva));
    } else {
      setArancel('');
      setIva('');
    }
  };

  const total = (Number(arancel) || 0) + (Number(iva) || 0);

  const handleSave = () => {
    if (!selectedId) return;
    const errs: Record<string, string> = {};
    if (!arancel || Number(arancel) < 0) errs.arancel = 'Arancel requerido';
    if (!iva || Number(iva) < 0) errs.iva = 'IVA requerido';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    saveInternacion(selectedId, {
      arancel: Number(arancel),
      iva: Number(iva),
      total,
    });
  };

  const internStatus = (box: typeof eligibleBoxes[0]) =>
    box.internacion ? 'registrada' : 'pendiente';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Internación</h2>

      {eligibleBoxes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin cajas para internación"
          description="No hay cajas en tránsito o llegada para registrar internación."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Box list */}
          <div className="lg:col-span-2">
            <Card padding="none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Internación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleBoxes.map(box => (
                    <TableRow
                      key={box.id}
                      className={`cursor-pointer ${selectedId === box.id ? 'bg-primary/5' : ''}`}
                      onClick={() => handleSelect(box.id)}
                    >
                      <TableCell className="font-medium">{box.id}</TableCell>
                      <TableCell>{box.fecha}</TableCell>
                      <TableCell><StatusBadge status={box.estado} /></TableCell>
                      <TableCell>
                        <Badge variant={box.internacion ? 'success' : 'warning'}>
                          {box.internacion ? 'Registrada' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* Internación form */}
          <div>
            {selectedBox ? (
              <Card padding="md">
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-foreground">{selectedBox.id}</p>
                    <p className="text-xs text-muted-foreground">{selectedBox.fecha}</p>
                  </div>

                  {selectedBox.internacion && (
                    <div className="p-3 rounded-lg bg-[#00e676]/10 border border-[#00e676]/20">
                      <p className="text-xs text-[#00e676] font-medium">Internación ya registrada</p>
                    </div>
                  )}

                  <Input
                    label="Arancel CIF (CLP)"
                    type="number"
                    value={arancel}
                    onChange={e => setArancel(e.target.value)}
                    error={errors.arancel}
                  />
                  <Input
                    label="IVA pagado en aduana (CLP)"
                    hint="IVA Crédito Fiscal"
                    type="number"
                    value={iva}
                    onChange={e => setIva(e.target.value)}
                    error={errors.iva}
                  />

                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <PriceDisplay amount={total} currency="CLP" className="text-lg font-bold" />
                    </div>
                  </div>

                  <Button fullWidth onClick={handleSave}>
                    <Save className="w-4 h-4" /> Guardar Internación
                  </Button>
                </div>
              </Card>
            ) : (
              <Card padding="md">
                <p className="text-sm text-muted-foreground text-center py-8">
                  Seleccione una caja para registrar internación
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
