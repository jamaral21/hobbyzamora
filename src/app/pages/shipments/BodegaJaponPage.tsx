import { useState, useMemo } from 'react';
import { Package, Boxes, Hash, DollarSign } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Select } from '../../components/design-system/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { KPICard } from '../../components/shipments/KPICard';
import { EmptyState } from '../../components/design-system/EmptyState';
import type { PaymentState } from '../../data/shipmentsDomain';

export default function BodegaJaponPage() {
  const { compras, calcDisponibleBySku } = useShipmentsData();
  const [filterEstado, setFilterEstado] = useState<PaymentState | 'all'>('all');

  const items = useMemo(() => {
    return compras
      .map((c) => {
        const disponible = calcDisponibleBySku(c.sku);
        return { ...c, disponible };
      })
      .filter((c) => c.disponible > 0)
      .filter((c) => filterEstado === 'all' || c.estado === filterEstado);
  }, [compras, calcDisponibleBySku, filterEstado]);

  const kpis = useMemo(() => {
    const allAvailable = compras
      .map((c) => ({ ...c, disponible: calcDisponibleBySku(c.sku) }))
      .filter((c) => c.disponible > 0);

    const skus = new Set(allAvailable.map((c) => c.sku)).size;
    const unidades = allAvailable.reduce((s, c) => s + c.disponible, 0);
    const totalJPY = allAvailable.reduce((s, c) => s + c.precioU * c.disponible, 0);
    const totalCLP = allAvailable.reduce((s, c) => {
      const tc = c.tc && c.tc > 0 ? c.tc : 6.0;
      return s + (c.precioU * c.disponible) * tc;
    }, 0);

    return { skus, unidades, totalJPY, totalCLP: Math.round(totalCLP) };
  }, [compras, calcDisponibleBySku]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Bodega Japón</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="SKUs Disponibles" value={kpis.skus} icon={Hash} />
        <KPICard title="Unidades Disponibles" value={kpis.unidades} icon={Boxes} />
        <KPICard title="Total ¥" value={`¥${kpis.totalJPY.toLocaleString('es-CL')}`} icon={Package} />
        <KPICard title="Total CLP Estimado" value={`$${kpis.totalCLP.toLocaleString('es-CL')}`} icon={DollarSign} />
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select
          label="Estado Pago"
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as PaymentState | 'all')}
        >
          <option value="all">Todos</option>
          <option value="por_pagar">Por Pagar</option>
          <option value="esp_pago">Esp. Pago</option>
          <option value="pagado">Pagado</option>
        </Select>
      </div>

      {/* Table */}
      <Card padding="none">
        {items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Bodega vacía"
            description="No hay productos disponibles en Japón con los filtros seleccionados."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead>Tarjeta</TableHead>
                <TableHead className="text-right">Precio ¥</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Total ¥</TableHead>
                <TableHead>Estado Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs">{c.sku}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{c.nombre}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.ean || '—'}</TableCell>
                  <TableCell>{c.tarjeta}</TableCell>
                  <TableCell className="text-right"><PriceDisplay amount={c.precioU} currency="JPY" /></TableCell>
                  <TableCell className="text-right font-[family-name:var(--font-mono)]">
                    {c.disponible} / {c.cant}
                  </TableCell>
                  <TableCell className="text-right">
                    <PriceDisplay amount={c.precioU * c.disponible} currency="JPY" />
                  </TableCell>
                  <TableCell><StatusBadge status={c.estado} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
