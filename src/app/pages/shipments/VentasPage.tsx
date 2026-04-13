import { useState, useMemo } from 'react';
import { Plus, ShoppingBag } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Modal, ModalFooter } from '../../components/design-system/Modal';
import { Input, Select } from '../../components/design-system/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { Badge } from '../../components/design-system/Badge';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { EmptyState } from '../../components/design-system/EmptyState';
import type { SalesChannel } from '../../data/shipmentsMockData';

const CANALES: SalesChannel[] = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'];

const canalVariant: Record<SalesChannel, 'info' | 'brand' | 'success' | 'warning' | 'danger'> = {
  Instagram: 'brand',
  TikTok: 'info',
  'Mercado Libre': 'warning',
  Web: 'success',
  Local: 'danger',
};

interface FormData {
  stockId: string;
  cant: string;
  precioVenta: string;
  canal: SalesChannel;
}

const emptyForm: FormData = {
  stockId: '',
  cant: '',
  precioVenta: '',
  canal: 'Instagram',
};

export default function VentasPage() {
  const { ventas, stockChile, addVenta } = useShipmentsData();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Available stock (cant > 0)
  const availableStock = useMemo(
    () => stockChile.filter((s) => s.cant > 0),
    [stockChile],
  );

  const selectedStock = useMemo(
    () => stockChile.find((s) => s.id === form.stockId),
    [stockChile, form.stockId],
  );

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.stockId) e.stockId = 'Selecciona un producto';
    const cant = Number(form.cant);
    if (!form.cant || cant <= 0 || !Number.isInteger(cant)) {
      e.cant = 'Debe ser entero mayor a 0';
    } else if (selectedStock && cant > selectedStock.cant) {
      e.cant = `Stock insuficiente (máx: ${selectedStock.cant})`;
    }
    const precio = Number(form.precioVenta);
    if (!form.precioVenta || precio <= 0) e.precioVenta = 'Debe ser mayor a 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    addVenta({
      stockId: form.stockId,
      cant: Number(form.cant),
      precioVenta: Number(form.precioVenta),
      canal: form.canal,
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

  function handleStockChange(stockId: string) {
    const stock = stockChile.find((s) => s.id === stockId);
    setForm({
      ...form,
      stockId,
      precioVenta: stock?.precioVenta != null && stock.precioVenta > 0 ? String(stock.precioVenta) : '',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Ventas</h2>
        <Button size="sm" onClick={openModal}>
          <Plus className="w-4 h-4" /> Nueva Venta
        </Button>
      </div>

      {/* Table */}
      <Card padding="none">
        {ventas.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Sin ventas"
            description="No hay ventas registradas. Registra una nueva venta para comenzar."
            action={{ label: 'Nueva Venta', onClick: openModal }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio Venta</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Canal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventas.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs">{v.id}</TableCell>
                  <TableCell>{v.fecha}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{v.producto}</TableCell>
                  <TableCell className="text-right">{v.cant}</TableCell>
                  <TableCell className="text-right"><PriceDisplay amount={v.precioVenta} currency="CLP" /></TableCell>
                  <TableCell className="text-right"><PriceDisplay amount={v.costo} currency="CLP" /></TableCell>
                  <TableCell className="text-right"><PriceDisplay amount={v.total} currency="CLP" /></TableCell>
                  <TableCell>
                    <Badge variant={canalVariant[v.canal]}>{v.canal}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal Nueva Venta */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Venta" size="md">
        <div className="space-y-4">
          <Select
            label="Producto"
            value={form.stockId}
            onChange={(e) => handleStockChange(e.target.value)}
            error={errors.stockId}
          >
            <option value="">Seleccionar producto...</option>
            {availableStock.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} — Stock: {s.cant} ({s._sku})
              </option>
            ))}
          </Select>

          {selectedStock && (
            <p className="text-xs text-muted-foreground">
              Stock disponible: {selectedStock.cant} · Costo unit.: <PriceDisplay amount={selectedStock.costoUnit} currency="CLP" />
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cantidad"
              type="number"
              min="1"
              max={selectedStock?.cant ?? undefined}
              step="1"
              value={form.cant}
              onChange={(e) => setForm({ ...form, cant: e.target.value })}
              placeholder="0"
              error={errors.cant}
            />
            <Input
              label="Precio de Venta CLP"
              type="number"
              min="1"
              value={form.precioVenta}
              onChange={(e) => setForm({ ...form, precioVenta: e.target.value })}
              placeholder="0"
              error={errors.precioVenta}
            />
          </div>

          <Select
            label="Canal"
            value={form.canal}
            onChange={(e) => setForm({ ...form, canal: e.target.value as SalesChannel })}
          >
            {CANALES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>

          {form.precioVenta && form.cant && (
            <p className="text-sm text-muted-foreground">
              Total: <PriceDisplay amount={Number(form.precioVenta) * Number(form.cant)} currency="CLP" />
            </p>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Registrar Venta</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
