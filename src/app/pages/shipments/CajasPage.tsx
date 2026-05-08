import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Package, Plus, Eye, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Modal, ModalFooter } from '../../components/design-system/Modal';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { EmptyState } from '../../components/design-system/EmptyState';
import type { Box, BoxProduct } from '../../data/shipmentsDomain';

interface ProductRow {
  _compraId: number;
  _sku: string;
  nombre: string;
  ean: string;
  precioU: number;
  tc: number;
  disponible: number;
  cant: number;
}

export default function CajasPage() {
  const {
    cajas, compras, addCaja, updateCaja, deleteCaja, calcDisponibleBySku,
  } = useShipmentsData();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [fleteJpy, setFleteJpy] = useState('');
  const [moHoras, setMoHoras] = useState('');
  const [moTarifa, setMoTarifa] = useState('');
  const [matJpy, setMatJpy] = useState('');
  const [tcEnvio, setTcEnvio] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<ProductRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Available products from Bodega Japón
  const availableProducts = useMemo(() => {
    const products: ProductRow[] = [];
    for (const c of compras) {
      const disp = calcDisponibleBySku(c.sku);
      if (disp > 0) {
        products.push({
          _compraId: c.id,
          _sku: c.sku,
          nombre: c.nombre,
          ean: c.ean,
          precioU: c.precioU,
          tc: c.tc || 6.0,
          disponible: disp,
          cant: 0,
        });
      }
    }
    return products;
  }, [compras, calcDisponibleBySku]);

  const resetForm = () => {
    setNombre('');
    setFecha(new Date().toISOString().split('T')[0]);
    setFleteJpy('');
    setMoHoras('');
    setMoTarifa('');
    setMatJpy('');
    setTcEnvio('');
    setSelectedProducts([]);
    setErrors({});
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (box: Box) => {
    setEditingId(box.id);
    setNombre(box.id);
    setFecha(box.fecha);
    setFleteJpy(String(box.flete_jpy));
    setMoHoras(String(box.mo_horas));
    setMoTarifa(String(box.mo_tarifa));
    setMatJpy(String(box.mat_jpy));
    setTcEnvio(String(box.tc_envio));
    setSelectedProducts([]);
    setErrors({});
    setModalOpen(true);
  };

  const handleProductQtyChange = (sku: string, qty: number) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p._sku === sku);
      if (existing) {
        return prev.map(p => p._sku === sku ? { ...p, cant: qty } : p);
      }
      const avail = availableProducts.find(p => p._sku === sku);
      if (avail) {
        return [...prev, { ...avail, cant: qty }];
      }
      return prev;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nombre.trim()) errs.nombre = 'Nombre requerido';
    else if (!editingId && cajas.some(c => c.id === nombre.trim())) {
      errs.nombre = 'Ya existe una caja con ese nombre';
    }
    if (!fleteJpy || Number(fleteJpy) < 0) errs.flete = 'Flete requerido';
    if (!moHoras || Number(moHoras) < 0) errs.moHoras = 'Horas MO requeridas';
    if (!moTarifa || Number(moTarifa) < 0) errs.moTarifa = 'Tarifa MO requerida';
    if (!matJpy || Number(matJpy) < 0) errs.mat = 'Materiales requerido';
    if (!tcEnvio || Number(tcEnvio) <= 0) errs.tc = 'TC requerido y mayor a 0';
    if (!editingId) {
      const withQty = selectedProducts.filter(p => p.cant > 0);
      if (withQty.length === 0) errs.productos = 'Seleccione al menos un producto';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (editingId) {
      updateCaja(editingId, {
        id: nombre.trim(),
        fecha,
        flete_jpy: Number(fleteJpy),
        mo_horas: Number(moHoras),
        mo_tarifa: Number(moTarifa),
        mat_jpy: Number(matJpy),
        tc_envio: Number(tcEnvio),
      });
    } else {
      const productos: BoxProduct[] = selectedProducts
        .filter(p => p.cant > 0)
        .map(p => ({
          _compraId: p._compraId,
          _sku: p._sku,
          nombre: p.nombre,
          ean: p.ean,
          cant: p.cant,
          precioU: p.precioU,
          tc: p.tc,
        }));

      addCaja({
        id: nombre.trim(),
        fecha,
        estado: 'transito',
        flete_jpy: Number(fleteJpy),
        mo_horas: Number(moHoras),
        mo_tarifa: Number(moTarifa),
        mat_jpy: Number(matJpy),
        tc_envio: Number(tcEnvio),
        productos,
      });
    }

    setModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta caja?')) {
      deleteCaja(id);
    }
  };

  const totalValue = (box: Box) =>
    box.productos.reduce((s, p) => s + p.precioU * p.cant, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Cajas / Envíos</h2>
        <Button size="sm" onClick={openCreateModal}>
          <Plus className="w-4 h-4" /> Nueva Caja
        </Button>
      </div>

      {cajas.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Sin cajas registradas"
          description="Crea una nueva caja para comenzar a enviar productos."
          action={{ label: 'Nueva Caja', onClick: openCreateModal }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cajas.map(box => (
            <Card key={box.id} padding="md">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{box.id}</p>
                    <p className="text-xs text-muted-foreground">{box.fecha}</p>
                  </div>
                  <StatusBadge status={box.estado} />
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{box.productos.length} producto(s)</span>
                  <PriceDisplay amount={totalValue(box)} currency="JPY" />
                </div>

                {/* Action buttons by state */}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(expandedId === box.id ? null : box.id)}
                  >
                    {expandedId === box.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    Ver
                  </Button>

                  {box.estado === 'transito' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => openEditModal(box)}>
                        <Pencil className="w-4 h-4" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(box.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}

                  {box.estado === 'llegada' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/shipments/costeo')}
                      >
                        Hacer Costeo
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(box.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Expanded product list */}
                {expandedId === box.id && (
                  <div className="pt-3 border-t border-border space-y-2">
                    {box.productos.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-foreground">{p.nombre}</p>
                          <p className="text-xs text-muted-foreground">{p._sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-foreground">×{p.cant}</p>
                          <PriceDisplay amount={p.precioU} currency="JPY" className="text-xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingId ? 'Editar Caja' : 'Nueva Caja'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              error={errors.nombre}
              disabled={!!editingId}
            />
            <Input
              label="Fecha"
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Flete UPS ¥"
              type="number"
              value={fleteJpy}
              onChange={e => setFleteJpy(e.target.value)}
              error={errors.flete}
            />
            <Input
              label="Horas MO"
              type="number"
              step="0.5"
              value={moHoras}
              onChange={e => setMoHoras(e.target.value)}
              error={errors.moHoras}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Tarifa MO CLP/h"
              type="number"
              value={moTarifa}
              onChange={e => setMoTarifa(e.target.value)}
              error={errors.moTarifa}
            />
            <Input
              label="Materiales ¥"
              type="number"
              value={matJpy}
              onChange={e => setMatJpy(e.target.value)}
              error={errors.mat}
            />
            <Input
              label="TC ¥→CLP"
              type="number"
              step="0.1"
              value={tcEnvio}
              onChange={e => setTcEnvio(e.target.value)}
              error={errors.tc}
            />
          </div>

          {/* Product selector — only for new boxes */}
          {!editingId && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Productos disponibles</p>
              {errors.productos && (
                <p className="text-xs text-destructive">{errors.productos}</p>
              )}
              {availableProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay productos disponibles en Bodega Japón.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-lg p-3">
                  {availableProducts.map(p => {
                    const selected = selectedProducts.find(s => s._sku === p._sku);
                    const qty = selected?.cant || 0;
                    return (
                      <div key={p._sku} className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{p.nombre}</p>
                          <p className="text-xs text-muted-foreground">{p._sku} · Disp: {p.disponible}</p>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={p.disponible}
                          value={qty}
                          onChange={e => handleProductQtyChange(p._sku, Math.min(Number(e.target.value), p.disponible))}
                          className="w-20 px-2 py-1 text-sm rounded border border-border bg-input-background text-foreground text-center"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => { setModalOpen(false); resetForm(); }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editingId ? 'Guardar' : 'Crear Caja'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
