import { useState } from 'react';
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input, Select } from '../../components/design-system/Input';
import { Modal, ModalFooter } from '../../components/design-system/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { EmptyState } from '../../components/design-system/EmptyState';

const PORTALS = ['Amazon Japan', 'Amazon USA', 'Rakuten', 'eBay', 'Otros'];

interface ProductFormRow {
  nombre: string;
  ean: string;
  cant: string;
  precio: string;
  pctCosteo: string;
}

const emptyProductRow = (): ProductFormRow => ({
  nombre: '', ean: '', cant: '1', precio: '0', pctCosteo: '0',
});

export default function ComprasWebPage() {
  const { pedidosWeb, addPedidoWeb } = useShipmentsData();
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [portal, setPortal] = useState(PORTALS[0]);
  const [orden, setOrden] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tc, setTc] = useState('');
  const [costoEnvio, setCostoEnvio] = useState('');
  const [productRows, setProductRows] = useState<ProductFormRow[]>([emptyProductRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setPortal(PORTALS[0]);
    setOrden('');
    setFecha(new Date().toISOString().split('T')[0]);
    setTc('');
    setCostoEnvio('');
    setProductRows([emptyProductRow()]);
    setErrors({});
  };

  const addRow = () => setProductRows(prev => [...prev, emptyProductRow()]);

  const removeRow = (idx: number) => {
    setProductRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  const updateRow = (idx: number, field: keyof ProductFormRow, value: string) => {
    setProductRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!orden.trim()) errs.orden = 'N° orden requerido';
    if (!tc || Number(tc) <= 0) errs.tc = 'TC requerido';
    if (!costoEnvio && costoEnvio !== '0') errs.costoEnvio = 'Costo envío requerido';
    const validProducts = productRows.filter(r => r.nombre.trim());
    if (validProducts.length === 0) errs.productos = 'Agregue al menos un producto';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const productos = productRows
      .filter(r => r.nombre.trim())
      .map(r => ({
        nombre: r.nombre.trim(),
        ean: r.ean.trim(),
        cant: Number(r.cant) || 1,
        precioUSD: Number(r.precio) || 0,
        precioCLP: Math.round((Number(r.precio) || 0) * (Number(tc) || 1)),
        pctCosteo: Number(r.pctCosteo) || 0,
        costoUnit: 0,
      }));

    addPedidoWeb({
      portal,
      orden: orden.trim(),
      fecha,
      tc: Number(tc),
      costoEnvioIntern: Number(costoEnvio) || 0,
      productos,
    });

    setModalOpen(false);
    resetForm();
  };

  const orderTotal = (order: typeof pedidosWeb[0]) =>
    order.productos.reduce((s, p) => s + p.precioCLP * p.cant, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Compras Web</h2>
        <Button size="sm" onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus className="w-4 h-4" /> Nuevo Pedido
        </Button>
      </div>

      {pedidosWeb.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Sin pedidos web"
          description="Registra un nuevo pedido web para comenzar."
          action={{ label: 'Nuevo Pedido', onClick: () => { resetForm(); setModalOpen(true); } }}
        />
      ) : (
        <Card padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Portal</TableHead>
                <TableHead>N° Orden</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidosWeb.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.fecha}</TableCell>
                  <TableCell>{order.portal}</TableCell>
                  <TableCell>{order.orden}</TableCell>
                  <TableCell><StatusBadge status={order.estado} /></TableCell>
                  <TableCell className="text-right">
                    <PriceDisplay amount={orderTotal(order)} currency="CLP" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* New Order Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title="Nuevo Pedido Web"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Portal"
              value={portal}
              onChange={e => setPortal(e.target.value)}
            >
              {PORTALS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Input
              label="N° Orden"
              value={orden}
              onChange={e => setOrden(e.target.value)}
              error={errors.orden}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
            <Input
              label="TC"
              type="number"
              step="0.1"
              value={tc}
              onChange={e => setTc(e.target.value)}
              error={errors.tc}
            />
            <Input
              label="Costo envío internacional CLP"
              type="number"
              value={costoEnvio}
              onChange={e => setCostoEnvio(e.target.value)}
              error={errors.costoEnvio}
            />
          </div>

          {/* Dynamic product rows */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Productos</p>
              <Button size="sm" variant="ghost" onClick={addRow}>
                <Plus className="w-3 h-3" /> Agregar
              </Button>
            </div>
            {errors.productos && (
              <p className="text-xs text-destructive">{errors.productos}</p>
            )}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {productRows.map((row, idx) => (
                <div key={idx} className="flex items-end gap-2 p-3 border border-border rounded-lg">
                  <div className="flex-1 grid grid-cols-5 gap-2">
                    <Input
                      label={idx === 0 ? 'Nombre' : undefined}
                      placeholder="Nombre"
                      value={row.nombre}
                      onChange={e => updateRow(idx, 'nombre', e.target.value)}
                    />
                    <Input
                      label={idx === 0 ? 'EAN' : undefined}
                      placeholder="EAN"
                      value={row.ean}
                      onChange={e => updateRow(idx, 'ean', e.target.value)}
                    />
                    <Input
                      label={idx === 0 ? 'Cant' : undefined}
                      type="number"
                      min={1}
                      value={row.cant}
                      onChange={e => updateRow(idx, 'cant', e.target.value)}
                    />
                    <Input
                      label={idx === 0 ? 'Precio' : undefined}
                      type="number"
                      value={row.precio}
                      onChange={e => updateRow(idx, 'precio', e.target.value)}
                    />
                    <Input
                      label={idx === 0 ? '% Costeo' : undefined}
                      type="number"
                      value={row.pctCosteo}
                      onChange={e => updateRow(idx, 'pctCosteo', e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => removeRow(idx)}
                    className="p-2 rounded hover:bg-secondary transition-colors text-muted-foreground"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => { setModalOpen(false); resetForm(); }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Crear Pedido</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
