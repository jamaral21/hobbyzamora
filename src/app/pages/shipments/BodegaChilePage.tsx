import { useState, useMemo } from 'react';
import { Package, DollarSign, AlertTriangle } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { KPICard } from '../../components/shipments/KPICard';
import { EmptyState } from '../../components/design-system/EmptyState';
import { calcMargin, marginColor } from '../../data/shipmentsMockData';

export default function BodegaChilePage() {
  const { stockChile, updatePrecioVenta } = useShipmentsData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // KPIs
  const kpis = useMemo(() => {
    const unidadesTotales = stockChile.reduce((s, e) => s + e.cant, 0);
    const valorInventario = stockChile.reduce((s, e) => s + e.cant * e.costoUnit, 0);
    const sinPrecio = stockChile.filter((e) => e.precioVenta === null || e.precioVenta <= 0).length;
    return { unidadesTotales, valorInventario, sinPrecio };
  }, [stockChile]);

  function startEdit(id: string, currentPrice: number | null) {
    setEditingId(id);
    setEditValue(currentPrice != null ? String(currentPrice) : '');
  }

  function commitEdit(id: string) {
    const val = Number(editValue);
    if (val > 0) {
      updatePrecioVenta(id, val);
    }
    setEditingId(null);
    setEditValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') commitEdit(id);
    if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
  }

  const marginColorClass: Record<string, string> = {
    green: 'text-[#00e676]',
    orange: 'text-[#ffab00]',
    red: 'text-destructive',
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Bodega Chile</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Unidades Totales" value={kpis.unidadesTotales} icon={Package} />
        <KPICard
          title="Valor Inventario CLP"
          value={`$${kpis.valorInventario.toLocaleString('es-CL')}`}
          icon={DollarSign}
          variant="success"
        />
        <KPICard
          title="Sin Precio de Venta"
          value={kpis.sinPrecio}
          icon={AlertTriangle}
          variant={kpis.sinPrecio > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Table */}
      <Card padding="none">
        {stockChile.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Sin stock en Chile"
            description="No hay productos en bodega Chile. Realiza un costeo de caja para agregar productos."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead>Caja</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Costo Unit.</TableHead>
                <TableHead className="text-right">Precio Venta</TableHead>
                <TableHead className="text-right">Margen %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockChile.map((entry) => {
                const margin = entry.precioVenta != null && entry.precioVenta > 0
                  ? calcMargin(entry.precioVenta, entry.costoUnit)
                  : null;
                const mColor = margin != null ? marginColor(margin) : null;

                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-[family-name:var(--font-mono)] text-xs">{entry._sku}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{entry.nombre}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{entry.ean || '—'}</TableCell>
                    <TableCell className="text-xs">{entry.caja}</TableCell>
                    <TableCell className="text-right">{entry.cant}</TableCell>
                    <TableCell className="text-right">
                      <PriceDisplay amount={entry.costoUnit} currency="CLP" />
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === entry.id ? (
                        <input
                          type="number"
                          min="1"
                          className="w-24 px-2 py-1 rounded border border-primary/40 bg-input-background text-foreground text-right text-sm font-[family-name:var(--font-mono)] focus:outline-none focus:ring-1 focus:ring-primary/30"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(entry.id)}
                          onKeyDown={(e) => handleKeyDown(e, entry.id)}
                          autoFocus
                        />
                      ) : (
                        <button
                          type="button"
                          className="cursor-pointer hover:bg-secondary px-2 py-1 rounded transition-colors"
                          onClick={() => startEdit(entry.id, entry.precioVenta)}
                        >
                          {entry.precioVenta != null && entry.precioVenta > 0 ? (
                            <PriceDisplay amount={entry.precioVenta} currency="CLP" />
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Sin precio</span>
                          )}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {margin != null && mColor ? (
                        <span className={`font-[family-name:var(--font-mono)] text-sm font-semibold ${marginColorClass[mColor]}`}>
                          {margin.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
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
