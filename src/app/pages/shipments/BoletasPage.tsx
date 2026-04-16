import { useState, useMemo } from 'react';
import { FileText, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Modal, ModalFooter } from '../../components/design-system/Modal';
import { Input } from '../../components/design-system/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { EmptyState } from '../../components/design-system/EmptyState';
import { calcInvoiceTotals } from '../../data/shipmentsMockData';

interface SelectedItem {
  compraId: number;
  nombre: string;
  ean: string;
  tipo: string;
  precioU: number;
  maxCant: number;
  cant: number;
  selected: boolean;
}

export default function BoletasPage() {
  const { boletas, boletaItems, compras, config, addBoleta } = useShipmentsData();
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comision, setComision] = useState(String(config.comisionPct));
  const [tc, setTc] = useState('6.0');
  const [items, setItems] = useState<SelectedItem[]>([]);

  function openModal() {
    const selectable = compras.map((c) => ({
      compraId: c.id,
      nombre: c.nombre,
      ean: c.ean,
      tipo: c.tipo,
      precioU: c.precioU,
      maxCant: c.cant,
      cant: c.cant,
      selected: false,
    }));
    setItems(selectable);
    setComision(String(config.comisionPct));
    setTc('6.0');
    setShowModal(true);
  }

  function toggleItem(idx: number) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it));
  }

  function updateCant(idx: number, val: string) {
    const n = Math.max(1, Math.min(items[idx].maxCant, Number(val) || 1));
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, cant: n } : it));
  }

  const selectedItems = useMemo(() => items.filter((it) => it.selected), [items]);

  const preview = useMemo(() => {
    if (selectedItems.length === 0) return null;
    return calcInvoiceTotals(
      selectedItems.map((it) => ({ precioU: it.precioU, cant: it.cant })),
      Number(comision) || 0,
      Number(tc) || 1,
    );
  }, [selectedItems, comision, tc]);

  function handleSubmit() {
    if (selectedItems.length === 0) return;
    addBoleta({
      items: selectedItems.map((it) => ({
        compraId: it.compraId,
        precioU: it.precioU,
        cant: it.cant,
        nombre: it.nombre,
        ean: it.ean,
        tipo: it.tipo,
      })),
      comisionPct: Number(comision) || config.comisionPct,
      tc: Number(tc) || 6.0,
    });
    setShowModal(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Boletas</h2>
        <Button size="sm" onClick={openModal}>
          <Plus className="w-4 h-4" /> Generar Boleta
        </Button>
      </div>

      <Card padding="none">
        {boletas.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin boletas"
            description="No se han generado boletas aún."
            action={{ label: 'Generar Boleta', onClick: openModal }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead className="text-right">Subtotal ¥</TableHead>
                <TableHead className="text-right">Comisión %</TableHead>
                <TableHead className="text-right">Total ¥</TableHead>
                <TableHead className="text-right">TC</TableHead>
                <TableHead className="text-right">Total CLP</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boletas.map((b) => {
                const isExpanded = expandedId === b.id;
                const lineItems = boletaItems[b.id] || [];
                return (
                  <>{/* Fragment with key on first row */}
                    <TableRow
                      key={b.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : b.id)}
                    >
                      <TableCell>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-[family-name:var(--font-mono)] text-xs">{b.id}</TableCell>
                      <TableCell>{b.fecha}</TableCell>
                      <TableCell>{b.productos}</TableCell>
                      <TableCell className="text-right"><PriceDisplay amount={b.subtotalJPY} currency="JPY" /></TableCell>
                      <TableCell className="text-right">{b.comision}%</TableCell>
                      <TableCell className="text-right"><PriceDisplay amount={b.totalJPY} currency="JPY" /></TableCell>
                      <TableCell className="text-right font-[family-name:var(--font-mono)]">{b.tc}</TableCell>
                      <TableCell className="text-right"><PriceDisplay amount={b.totalCLP} currency="CLP" /></TableCell>
                      <TableCell><StatusBadge status={b.estado} /></TableCell>
                    </TableRow>
                    {isExpanded && lineItems.length > 0 && (
                      <TableRow key={`${b.id}-detail`} className="bg-secondary/30">
                        <TableCell colSpan={10}>
                          <div className="py-2 px-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Detalle de líneas</p>
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-muted-foreground text-left">
                                  <th className="pb-1 pr-4">Nombre</th>
                                  <th className="pb-1 pr-4">Tipo</th>
                                  <th className="pb-1 pr-4">EAN</th>
                                  <th className="pb-1 pr-4 text-right">Precio ¥</th>
                                  <th className="pb-1 pr-4 text-right">Cant</th>
                                  <th className="pb-1 pr-4 text-right">Subtotal ¥</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lineItems.map((li, idx) => (
                                  <tr key={idx} className="border-t border-border/50">
                                    <td className="py-1 pr-4">{li.nombre}</td>
                                    <td className="py-1 pr-4 text-muted-foreground">{li.tipo}</td>
                                    <td className="py-1 pr-4 text-xs text-muted-foreground">{li.ean || '—'}</td>
                                    <td className="py-1 pr-4 text-right"><PriceDisplay amount={li.precioU} currency="JPY" /></td>
                                    <td className="py-1 pr-4 text-right">{li.cant}</td>
                                    <td className="py-1 pr-4 text-right"><PriceDisplay amount={li.precioU * li.cant} currency="JPY" /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal Generar Boleta */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generar Boleta" size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Comisión %"
              type="number"
              min="0"
              max="100"
              value={comision}
              onChange={(e) => setComision(e.target.value)}
            />
            <Input
              label="Tipo de Cambio (TC)"
              type="number"
              min="0.01"
              step="0.1"
              value={tc}
              onChange={(e) => setTc(e.target.value)}
            />
          </div>

          <p className="text-sm font-medium text-foreground">Seleccionar productos:</p>
          <div className="max-h-[300px] overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b border-border">
                <tr className="text-muted-foreground text-left">
                  <th className="p-2 w-8" />
                  <th className="p-2">SKU</th>
                  <th className="p-2">Nombre</th>
                  <th className="p-2 text-right">Precio ¥</th>
                  <th className="p-2 text-right w-20">Cant</th>
                  <th className="p-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const compra = compras.find((c) => c.id === it.compraId);
                  return (
                    <tr key={it.compraId} className="border-t border-border/50 hover:bg-secondary/30">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={it.selected}
                          onChange={() => toggleItem(idx)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-2 font-[family-name:var(--font-mono)] text-xs">{compra?.sku}</td>
                      <td className="p-2 max-w-[200px] truncate">{it.nombre}</td>
                      <td className="p-2 text-right"><PriceDisplay amount={it.precioU} currency="JPY" /></td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="1"
                          max={it.maxCant}
                          value={it.cant}
                          onChange={(e) => updateCant(idx, e.target.value)}
                          disabled={!it.selected}
                          className="w-16 px-2 py-1 text-right rounded bg-input-background border border-border text-foreground text-sm disabled:opacity-40"
                        />
                      </td>
                      <td className="p-2 text-right">
                        {it.selected && <PriceDisplay amount={it.precioU * it.cant} currency="JPY" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {preview && (
            <Card padding="sm" className="bg-secondary/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ¥:</span>
                <PriceDisplay amount={preview.subtotalJPY} currency="JPY" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total ¥ (con {comision}% comisión):</span>
                <PriceDisplay amount={preview.totalJPY} currency="JPY" />
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-muted-foreground">Total CLP:</span>
                <PriceDisplay amount={Math.round(preview.totalCLP)} currency="CLP" />
              </div>
            </Card>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={selectedItems.length === 0}>
            Generar Boleta ({selectedItems.length} productos)
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
