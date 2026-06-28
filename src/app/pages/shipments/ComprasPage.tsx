import { useState, useMemo } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Modal, ModalFooter } from '../../components/design-system/Modal';
import { Input, Select } from '../../components/design-system/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { EmptyState } from '../../components/design-system/EmptyState';
import type { PaymentState, LocationState } from '../../data/shipmentsDomain';

interface FormData {
  fecha: string;
  tipo: string;
  nombre: string;
  ean: string;
  tarjeta: string;
  precioU: string;
  cant: string;
  tc: string;
}

const emptyForm: FormData = {
  fecha: new Date().toISOString().split('T')[0],
  tipo: 'Producto',
  nombre: '',
  ean: '',
  tarjeta: '',
  precioU: '',
  cant: '',
  tc: '',
};

export default function ComprasPage() {
  const { compras, config, addCompra, cajas, stockChile } = useShipmentsData();
  const metodosPagoDisponibles = (config.metodosPago || []).filter(Boolean);
  const metodosPago = metodosPagoDisponibles.length > 0 ? metodosPagoDisponibles : ['Efectivo'];
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [filterEstado, setFilterEstado] = useState<PaymentState | 'all'>('all');
  const [filterBodega, setFilterBodega] = useState<LocationState | 'all'>('all');

  const filtered = useMemo(() => {
    return compras.filter((c) => {
      if (filterEstado !== 'all' && c.estado !== filterEstado) return false;
      if (filterBodega !== 'all' && c.bodega !== filterBodega) return false;
      return true;
    });
  }, [compras, filterEstado, filterBodega]);

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.fecha) e.fecha = 'Requerido';
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.tarjeta) e.tarjeta = 'Requerido';
    const precio = Number(form.precioU);
    if (!form.precioU || precio <= 0) e.precioU = 'Debe ser mayor a 0';
    const cant = Number(form.cant);
    if (!form.cant || cant <= 0 || !Number.isInteger(cant)) e.cant = 'Debe ser entero mayor a 0';
    const tc = Number(form.tc);
    if (!form.tc || tc <= 0) e.tc = 'Debe ser mayor a 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const precioU = Number(form.precioU);
    const cant = Number(form.cant);
    addCompra({
      fecha: form.fecha,
      tipo: form.tipo,
      nombre: form.nombre.trim(),
      ean: form.ean.trim(),
      tarjeta: form.tarjeta,
      precioU,
      cant,
      total: precioU * cant,
      estado: 'por_pagar',
      bodega: 'japon',
      tc: Number(form.tc),
    });
    setShowModal(false);
    setForm({ ...emptyForm });
    setErrors({});
  }

  function openModal() {
    setForm({ ...emptyForm });
    setErrors({});
    setShowModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Registro de Compras</h2>
        <Button size="sm" onClick={openModal}>
          <Plus className="w-4 h-4" /> Nueva Compra
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
        <Select
          label="Bodega"
          value={filterBodega}
          onChange={(e) => setFilterBodega(e.target.value as LocationState | 'all')}
        >
          <option value="all">Todas</option>
          <option value="japon">Japón</option>
          <option value="transito">Tránsito</option>
          <option value="chile">Chile</option>
        </Select>
      </div>

      {/* Table */}
      <Card padding="none">
        {filtered.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Sin compras"
            description="No hay compras que coincidan con los filtros seleccionados."
            action={{ label: 'Nueva Compra', onClick: openModal }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead>Tarjeta</TableHead>
                <TableHead className="text-right">Precio ¥</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Total ¥</TableHead>
                <TableHead>Estado Pago</TableHead>
                <TableHead>Bodega</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                // compute units per location for this compra
                const unitsInTransito = cajas
                  .filter((b) => b.estado === 'transito')
                  .reduce((sum, box) => sum + (box.productos.filter((p) => p._sku === c.sku).reduce((s, p) => s + p.cant, 0)), 0);

                const unitsInLlegada = cajas
                  .filter((b) => b.estado === 'llegada')
                  .reduce((sum, box) => sum + (box.productos.filter((p) => p._sku === c.sku).reduce((s, p) => s + p.cant, 0)), 0);

                const unitsInChile = stockChile
                  .filter((s) => s._sku === c.sku)
                  .reduce((sum, s) => sum + s.cant, 0);

                const unitsInJapan = Math.max(0, c.cant - unitsInTransito - unitsInLlegada - unitsInChile);

                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-[family-name:var(--font-mono)] text-xs">{c.sku}</TableCell>
                    <TableCell>{c.fecha}</TableCell>
                    <TableCell>{c.tipo}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.nombre}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.ean || '—'}</TableCell>
                    <TableCell>{c.tarjeta}</TableCell>
                    <TableCell className="text-right"><PriceDisplay amount={c.precioU} currency="JPY" /></TableCell>
                    <TableCell className="text-right">{c.cant}</TableCell>
                    <TableCell className="text-right"><PriceDisplay amount={c.total} currency="JPY" /></TableCell>
                    <TableCell><StatusBadge status={c.estado} /></TableCell>
                    <TableCell className="flex items-center gap-2">
                      {unitsInJapan > 0 && <StatusBadge status={'japon'} />}
                      {unitsInTransito > 0 && <StatusBadge status={'transito'} />}
                      {unitsInLlegada > 0 && <StatusBadge status={'llegada'} />}
                      {unitsInChile > 0 && <StatusBadge status={'chile'} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal Nueva Compra */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Compra" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha"
            type="date"
            value={form.fecha}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            error={errors.fecha}
          />
          <Select
            label="Tipo"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          >
            <option value="Producto">Producto</option>
            <option value="Arriendo/App">Arriendo/App</option>
          </Select>
          <div className="col-span-2">
            <Input
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre del producto"
              error={errors.nombre}
            />
          </div>
          <Input
            label="EAN (opcional)"
            value={form.ean}
            onChange={(e) => setForm({ ...form, ean: e.target.value })}
            placeholder="Código EAN"
          />
          <Select
            label="Tarjeta / Método de Pago"
            value={form.tarjeta}
            onChange={(e) => setForm({ ...form, tarjeta: e.target.value })}
            error={errors.tarjeta}
          >
            <option value="">Seleccionar...</option>
            {metodosPago.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <Input
            label="Precio Unitario ¥"
            type="number"
            min="1"
            value={form.precioU}
            onChange={(e) => setForm({ ...form, precioU: e.target.value })}
            placeholder="0"
            error={errors.precioU}
          />
          <Input
            label="Cantidad"
            type="number"
            min="1"
            step="1"
            value={form.cant}
            onChange={(e) => setForm({ ...form, cant: e.target.value })}
            placeholder="0"
            error={errors.cant}
          />
          <Input
            label="TC ¥→CLP"
            type="number"
            min="0.01"
            step="0.1"
            value={form.tc}
            onChange={(e) => setForm({ ...form, tc: e.target.value })}
            placeholder="6.0"
            error={errors.tc}
          />
          {form.precioU && form.cant && (
            <div className="flex items-end">
              <p className="text-sm text-muted-foreground">
                Total: <PriceDisplay amount={Number(form.precioU) * Number(form.cant)} currency="JPY" />
              </p>
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Registrar Compra</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
