import { useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Modal, ModalFooter } from '../../components/design-system/Modal';
import { Input } from '../../components/design-system/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { EmptyState } from '../../components/design-system/EmptyState';

interface FormData {
  fecha: string;
  tipo: 'producto' | 'gasto';
  docTipo: 'factura' | 'boleta';
  proveedor: string;
  descripcion: string;
  monto: string;
  iva: string;
  estado: 'pagado' | 'pendiente';
}

const emptyForm: FormData = {
  fecha: new Date().toISOString().split('T')[0],
  tipo: 'producto',
  docTipo: 'factura',
  proveedor: '',
  descripcion: '',
  monto: '',
  iva: '',
  estado: 'pendiente',
};

export default function ComprasLocalesPage() {
  const { comprasChile, addCompraChile } = useShipmentsData();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.fecha) e.fecha = 'Requerido';
    if (!form.proveedor.trim()) e.proveedor = 'Requerido';
    if (!form.descripcion.trim()) e.descripcion = 'Requerido';
    const monto = Number(form.monto);
    if (!form.monto || monto <= 0) e.monto = 'Debe ser mayor a 0';
    if (form.docTipo === 'factura') {
      const iva = Number(form.iva);
      if (!form.iva || iva < 0) e.iva = 'Debe ser 0 o mayor';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const isFactura = form.docTipo === 'factura';
    addCompraChile({
      fecha: form.fecha,
      tipo: form.tipo,
      docTipo: form.docTipo,
      proveedor: form.proveedor.trim(),
      descripcion: form.descripcion.trim(),
      monto: Number(form.monto),
      iva: isFactura ? Number(form.iva) : 0,
      ivaCredito: isFactura,
      estado: form.estado,
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
        <h2 className="text-xl font-semibold text-foreground">Compras Locales</h2>
        <Button size="sm" onClick={openModal}>
          <Plus className="w-4 h-4" /> Nueva Compra
        </Button>
      </div>

      {/* Table */}
      <Card padding="none">
        {comprasChile.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Sin compras locales"
            description="No hay compras locales registradas. Agrega una nueva compra para comenzar."
            action={{ label: 'Nueva Compra', onClick: openModal }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Doc. Tipo</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comprasChile.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-[family-name:var(--font-mono)] text-xs">{c.id}</TableCell>
                  <TableCell>{c.fecha}</TableCell>
                  <TableCell className="capitalize">{c.tipo}</TableCell>
                  <TableCell className="capitalize">{c.docTipo}</TableCell>
                  <TableCell>{c.proveedor}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{c.descripcion}</TableCell>
                  <TableCell className="text-right"><PriceDisplay amount={c.monto} currency="CLP" /></TableCell>
                  <TableCell className="text-right">
                    {c.iva > 0 ? <PriceDisplay amount={c.iva} currency="CLP" /> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell><StatusBadge status={c.estado} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal Nueva Compra */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Compra Local" size="lg">
        <div className="space-y-4">
          {/* Tipo toggle */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Tipo</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={form.tipo === 'producto' ? 'primary' : 'outline'}
                onClick={() => setForm({ ...form, tipo: 'producto' })}
                className="min-w-[100px]"
              >
                Producto
              </Button>
              <Button
                size="sm"
                variant={form.tipo === 'gasto' ? 'primary' : 'outline'}
                onClick={() => setForm({ ...form, tipo: 'gasto' })}
                className="min-w-[100px]"
              >
                Gasto
              </Button>
            </div>
          </div>

          {/* Documento toggle */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Documento</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={form.docTipo === 'factura' ? 'primary' : 'outline'}
                onClick={() => setForm({ ...form, docTipo: 'factura', iva: form.iva })}
                className="min-w-[100px]"
              >
                Factura
              </Button>
              <Button
                size="sm"
                variant={form.docTipo === 'boleta' ? 'primary' : 'outline'}
                onClick={() => setForm({ ...form, docTipo: 'boleta', iva: '' })}
                className="min-w-[100px]"
              >
                Boleta
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              error={errors.fecha}
            />
            <Input
              label="Proveedor"
              value={form.proveedor}
              onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              placeholder="Nombre del proveedor"
              error={errors.proveedor}
            />
            <div className="col-span-2">
              <Input
                label="Descripción"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción de la compra"
                error={errors.descripcion}
              />
            </div>
            <Input
              label="Monto CLP"
              type="number"
              min="1"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              placeholder="0"
              error={errors.monto}
            />
            {form.docTipo === 'factura' && (
              <Input
                label="IVA CLP"
                type="number"
                min="0"
                value={form.iva}
                onChange={(e) => setForm({ ...form, iva: e.target.value })}
                placeholder="0"
                error={errors.iva}
              />
            )}
          </div>

          {/* Estado toggle */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Estado</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={form.estado === 'pendiente' ? 'primary' : 'outline'}
                onClick={() => setForm({ ...form, estado: 'pendiente' })}
                className="min-w-[100px]"
              >
                Pendiente
              </Button>
              <Button
                size="sm"
                variant={form.estado === 'pagado' ? 'primary' : 'outline'}
                onClick={() => setForm({ ...form, estado: 'pagado' })}
                className="min-w-[100px]"
              >
                Pagado
              </Button>
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>Registrar Compra</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
