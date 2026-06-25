import { useEffect, useMemo, useState } from 'react';
import { Plus, ShoppingBag } from 'lucide-react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Modal, ModalFooter } from '../../components/design-system/Modal';
import { Input, Select } from '../../components/design-system/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { Badge } from '../../components/design-system/Badge';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { EmptyState } from '../../components/design-system/EmptyState';
import { getAnyAuthToken } from '../../lib/authStorage';

const CANALES = ['Instagram', 'TikTok', 'Mercado Libre', 'Web', 'Local'] as const;
type SalesChannel = (typeof CANALES)[number];

type StockEntry = {
  id: string;
  sku: string;
  name: string;
  ean: string | null;
  stock: number;
  costUnit: number;
  salePrice: number;
};

type SaleEntry = {
  id: string;
  fecha: string;
  producto: string;
  productId: string;
  sku: string;
  ean: string | null;
  cant: number;
  precioVenta: number;
  costo: number;
  total: number;
  canal: SalesChannel;
};

type VentasResponse = { data: SaleEntry[] };
type BodegaChileResponse = { data: { items: StockEntry[] } };
type VentaCreateResponse = { data: SaleEntry };

const canalVariant: Record<SalesChannel, 'info' | 'brand' | 'success' | 'warning' | 'danger'> = {
  Instagram: 'brand',
  TikTok: 'info',
  'Mercado Libre': 'warning',
  Web: 'success',
  Local: 'danger',
};

interface FormData {
  productId: string;
  cant: string;
  precioVenta: string;
  canal: SalesChannel;
}

const emptyForm: FormData = {
  productId: '',
  cant: '',
  precioVenta: '',
  canal: 'Instagram',
};

async function shipmentsFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAnyAuthToken();
  const response = await fetch(`/api/shipments${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || response.statusText);
  }

  return response.json() as Promise<T>;
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<SaleEntry[]>([]);
  const [stockChile, setStockChile] = useState<StockEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ventasResp, stockResp] = await Promise.all([
        shipmentsFetch<VentasResponse>('/ventas'),
        shipmentsFetch<BodegaChileResponse>('/bodega-chile'),
      ]);
      setVentas(ventasResp.data);
      setStockChile(stockResp.data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar ventas');
      setVentas([]);
      setStockChile([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableStock = useMemo(() => stockChile.filter((s) => s.stock > 0), [stockChile]);

  const selectedStock = useMemo(
    () => stockChile.find((s) => s.id === form.productId),
    [stockChile, form.productId],
  );

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.productId) e.productId = 'Selecciona un producto';
    const cant = Number(form.cant);
    if (!form.cant || cant <= 0 || !Number.isInteger(cant)) {
      e.cant = 'Debe ser entero mayor a 0';
    } else if (selectedStock && cant > selectedStock.stock) {
      e.cant = `Stock insuficiente (max: ${selectedStock.stock})`;
    }
    const precio = Number(form.precioVenta);
    if (!form.precioVenta || precio <= 0) e.precioVenta = 'Debe ser mayor a 0';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await shipmentsFetch<VentaCreateResponse>('/ventas', {
        method: 'POST',
        body: JSON.stringify({
          productId: form.productId,
          cant: Number(form.cant),
          precioVenta: Number(form.precioVenta),
          canal: form.canal,
        }),
      });

      setVentas((prev) => [response.data, ...prev]);
      setStockChile((prev) =>
        prev.map((item) =>
          item.id === form.productId
            ? { ...item, stock: Math.max(0, item.stock - Number(form.cant)) }
            : item
        )
      );

      setShowModal(false);
      setForm({ ...emptyForm });
      setErrors({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la venta');
    } finally {
      setSaving(false);
    }
  }

  function openModal() {
    setForm({ ...emptyForm });
    setErrors({});
    setShowModal(true);
  }

  function handleStockChange(productId: string) {
    const stock = stockChile.find((s) => s.id === productId);
    setForm({
      ...form,
      productId,
      precioVenta: stock?.salePrice != null && stock.salePrice > 0 ? String(stock.salePrice) : '',
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

      {error && (
        <Card>
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <Card padding="none">
        {isLoading ? (
          <EmptyState
            icon={ShoppingBag}
            title="Cargando ventas"
            description="Obteniendo historial de ventas y stock disponible..."
          />
        ) : ventas.length === 0 ? (
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
                  <TableCell>{new Date(v.fecha).toLocaleDateString('es-CL')}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{v.producto}</TableCell>
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nueva Venta" size="md">
        <div className="space-y-4">
          <Select
            label="Producto"
            value={form.productId}
            onChange={(e) => handleStockChange(e.target.value)}
            error={errors.productId}
          >
            <option value="">Seleccionar producto...</option>
            {availableStock.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — Stock: {s.stock} ({s.sku})
              </option>
            ))}
          </Select>

          {selectedStock && (
            <p className="text-xs text-muted-foreground">
              Stock disponible: {selectedStock.stock} · Costo unit.: <PriceDisplay amount={selectedStock.costUnit} currency="CLP" />
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cantidad"
              type="number"
              min="1"
              max={selectedStock?.stock ?? undefined}
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
          <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Venta'}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
