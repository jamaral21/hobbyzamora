import { useState, useMemo } from 'react';
import { Calculator, CheckCircle } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Select } from '../../components/design-system/Input';
import { Switch } from '../../components/design-system/Switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { EmptyState } from '../../components/design-system/EmptyState';
import { calcCostoUnitario } from '../../data/shipmentsDomain';

interface CosteoRow {
  _compraId: number;
  _sku: string;
  nombre: string;
  ean: string;
  cant: number;
  pct: number;
  sellable: number;
  collection: number;
  personal: number;
}

export default function CosteoPage() {
  const { cajas, confirmCosteo } = useShipmentsData();
  const [selectedCajaId, setSelectedCajaId] = useState('');
  const [costeoRows, setCosteoRows] = useState<CosteoRow[]>([]);
  const [holdUnassigned, setHoldUnassigned] = useState(false);

  const llegadaBoxes = useMemo(
    () => cajas.filter(b => b.estado === 'llegada'),
    [cajas],
  );

  const selectedBox = useMemo(
    () => llegadaBoxes.find(b => b.id === selectedCajaId) || null,
    [llegadaBoxes, selectedCajaId],
  );

  const handleSelectBox = (id: string) => {
    setSelectedCajaId(id);
    const box = llegadaBoxes.find(b => b.id === id);
    if (box) {
      setCosteoRows(
        box.productos.map(p => ({
          _compraId: p._compraId,
          _sku: p._sku,
          nombre: p.nombre,
          ean: p.ean,
          cant: p.cant,
          pct: box.productos.length > 0
            ? Math.round(100 / box.productos.length * 100) / 100
            : 0,
          sellable: 0,
          collection: 0,
          personal: 0,
        })),
      );
    } else {
      setCosteoRows([]);
    }
    setHoldUnassigned(false);
  };

  const updatePct = (idx: number, value: number) => {
    setCosteoRows(prev => prev.map((r, i) => i === idx ? { ...r, pct: value } : r));
  };

  const updateDestination = (
    index: number,
    field: 'sellable' | 'collection' | 'personal',
    value: number,
  ) => {
    setCosteoRows((previous) => previous.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      return { ...row, [field]: Math.max(0, Math.min(value, row.cant)) };
    }));
  };

  const pctSum = useMemo(
    () => costeoRows.reduce((s, r) => s + r.pct, 0),
    [costeoRows],
  );

  const isValid = Math.abs(pctSum - 100) < 0.01;

  // Cost breakdown
  const breakdown = useMemo(() => {
    if (!selectedBox) return null;
    const subtotalCLP = selectedBox.productos.reduce(
      (s, p) => s + p.precioU * p.cant * (1 / selectedBox.tc_envio), 0,
    );
    const fleteCLP = selectedBox.flete_jpy / selectedBox.tc_envio;
    const moCLP = selectedBox.mo_horas * selectedBox.mo_tarifa;
    const matCLP = selectedBox.mat_jpy / selectedBox.tc_envio;
    const internCLP = selectedBox.internacion
      ? selectedBox.internacion.arancel + selectedBox.internacion.iva
      : 0;
    return { subtotalCLP, fleteCLP, moCLP, matCLP, internCLP };
  }, [selectedBox]);

  const handleConfirm = () => {
    if (!selectedBox || !isValid) return;

    const costeoData = costeoRows.map(r => ({
      _compraId: r._compraId,
      _sku: r._sku,
      nombre: r.nombre,
      ean: r.ean,
      cant: r.cant,
      pct: r.pct,
      costoUnit: calcCostoUnitario(selectedBox, r.pct, r.cant),
      sellable: r.sellable,
      collection: r.collection,
      personal: r.personal,
    }));

    confirmCosteo(selectedCajaId, costeoData, holdUnassigned);
    setSelectedCajaId('');
    setCosteoRows([]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Costeo de Cajas</h2>

      {/* Box selector */}
      <Card padding="md">
        <Select
          label="Seleccionar caja (estado: llegada)"
          value={selectedCajaId}
          onChange={e => handleSelectBox(e.target.value)}
        >
          <option value="">— Seleccione una caja —</option>
          {llegadaBoxes.map(b => (
            <option key={b.id} value={b.id}>{b.id} ({b.fecha})</option>
          ))}
        </Select>
      </Card>

      {llegadaBoxes.length === 0 && !selectedBox && (
        <EmptyState
          icon={Calculator}
          title="Sin cajas para costear"
          description="No hay cajas con estado 'llegada'. Cambie el estado de una caja desde Bodega Tránsito."
        />
      )}

      {selectedBox && (
        <>
          {/* Cost breakdown */}
          {breakdown && (
            <Card padding="md">
              <p className="text-sm font-medium text-foreground mb-3">Desglose de costos</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Subtotal CLP</p>
                  <PriceDisplay amount={Math.round(breakdown.subtotalCLP)} currency="CLP" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Flete CLP</p>
                  <PriceDisplay amount={Math.round(breakdown.fleteCLP)} currency="CLP" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MO CLP</p>
                  <PriceDisplay amount={Math.round(breakdown.moCLP)} currency="CLP" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Materiales CLP</p>
                  <PriceDisplay amount={Math.round(breakdown.matCLP)} currency="CLP" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Internación CLP</p>
                  <PriceDisplay amount={Math.round(breakdown.internCLP)} currency="CLP" />
                </div>
              </div>
            </Card>
          )}

          {/* Percentage sum indicator */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Suma de porcentajes:</span>
            <span
              className={`text-sm font-bold font-[family-name:var(--font-mono)] ${
                isValid ? 'text-[#00e676]' : 'text-destructive'
              }`}
            >
              {pctSum.toFixed(2)}%
            </span>
            {isValid && <CheckCircle className="w-4 h-4 text-[#00e676]" />}
          </div>

          {/* Costing table */}
          <Card padding="none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-center">% Costo</TableHead>
                  <TableHead className="text-center">Venta</TableHead>
                  <TableHead className="text-center">Colección</TableHead>
                  <TableHead className="text-center">Personal</TableHead>
                  <TableHead className="text-right">Costo Unitario CLP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costeoRows.map((row, idx) => {
                  const costoUnit = calcCostoUnitario(selectedBox, row.pct, row.cant);
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row._sku}</TableCell>
                      <TableCell>{row.nombre}</TableCell>
                      <TableCell className="text-center">{row.cant}</TableCell>
                      <TableCell className="text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={row.pct}
                          onChange={e => updatePct(idx, Number(e.target.value))}
                          className="w-20 px-2 py-1 text-sm rounded border border-border bg-input-background text-foreground text-center"
                        />
                      </TableCell>
                      {(['sellable', 'collection', 'personal'] as const).map((field) => (
                        <TableCell key={field} className="text-center">
                          <input
                            type="number"
                            min={0}
                            max={row.cant}
                            value={row[field]}
                            aria-label={`${field}-${row._sku}`}
                            onChange={event => updateDestination(idx, field, Number(event.target.value))}
                            className="w-16 px-2 py-1 text-sm rounded border border-border bg-input-background text-foreground text-center"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <PriceDisplay amount={costoUnit} currency="CLP" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <Switch
            checked={holdUnassigned}
            onChange={setHoldUnassigned}
            label="Dejar unidades no ingresadas como pendientes"
          />
          <p className="text-xs text-muted-foreground">
            Desactivado: las unidades sin destino quedan registradas como histórico y no afectan el inventario.
          </p>

          <div className="flex justify-end">
            <Button onClick={handleConfirm} disabled={!isValid}>
              <CheckCircle className="w-4 h-4" /> Confirmar Costeo
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
