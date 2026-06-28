import { useState, useMemo } from 'react';
import { FileText, Plus, ChevronDown, ChevronUp, Pencil, Printer } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Modal, ModalFooter } from '../../components/design-system/Modal';
import { Input } from '../../components/design-system/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { EmptyState } from '../../components/design-system/EmptyState';
import { calcInvoiceTotals } from '../../data/shipmentsDomain';
import type { Invoice } from '../../data/shipmentsDomain';
import { openInvoicePrintPreview } from '../../lib/invoicePrint';

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

interface EditLineItem {
  nombre: string;
  ean: string;
  tipo: string;
  precioU: number;
  cant: number;
}

export default function BoletasPage() {
  const { boletas, boletaItems, compras, config, addBoleta, updateBoleta } = useShipmentsData();
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comision, setComision] = useState(String(config.comisionPct));
  const [tc, setTc] = useState('6.0');
  const [items, setItems] = useState<SelectedItem[]>([]);

  // Edit state
  const [editBoleta, setEditBoleta] = useState<Invoice | null>(null);
  const [editComision, setEditComision] = useState('');
  const [editTc, setEditTc] = useState('');
  const [editLines, setEditLines] = useState<EditLineItem[]>([]);

  function openModal() {
    // Build a map of already-used quantities per compraId from existing boletaItems
    const usedQuantities = new Map<number, number>();
    Object.values(boletaItems).forEach((lines) => {
      (lines || []).forEach((li: any) => {
        if (li.compraId != null) {
          const id = Number(li.compraId);
          const prev = usedQuantities.get(id) || 0;
          usedQuantities.set(id, prev + (Number(li.cant) || 0));
        }
      });
    });

    // Only include compras that are not fully pagadas
    const selectable = compras
      .filter((c) => c.estado !== 'pagado')
      .map((c) => {
        const used = usedQuantities.get(c.id) || 0;
        const remaining = Math.max(0, c.cant - used);
        return {
          compraId: c.id,
          nombre: c.nombre,
          ean: c.ean,
          tipo: c.tipo,
          precioU: c.precioU,
          maxCant: remaining,
          cant: remaining > 0 ? remaining : 0,
          selected: false,
        };
      });
    setItems(selectable);
    setComision(String(config.comisionPct));
    setTc('6.0');
    setShowModal(true);
  }

  function openEditModal(boleta: Invoice, e: React.MouseEvent) {
    e.stopPropagation();
    const lines: EditLineItem[] = (boletaItems[boleta.id] || []).map((li) => ({
      nombre: li.nombre,
      ean: li.ean,
      tipo: li.tipo,
      precioU: li.precioU,
      cant: li.cant,
    }));
    setEditBoleta(boleta);
    setEditComision(String(boleta.comision));
    setEditTc(String(boleta.tc));
    setEditLines(lines);
  }

  function updateEditLine(idx: number, field: keyof EditLineItem, value: string) {
    setEditLines((prev) => prev.map((li, i) => {
      if (i !== idx) return li;
      if (field === 'precioU' || field === 'cant') {
        return { ...li, [field]: Math.max(0, Number(value) || 0) };
      }
      return { ...li, [field]: value };
    }));
  }

  function handleEditSubmit() {
    if (!editBoleta) return;
    updateBoleta(editBoleta.id, {
      comisionPct: Number(editComision) || 0,
      tc: Number(editTc) || 1,
      items: editLines,
    });
    setEditBoleta(null);
  }

  const editPreview = useMemo(() => {
    if (editLines.length === 0) return null;
    return calcInvoiceTotals(
      editLines.map((li) => ({ precioU: li.precioU, cant: li.cant })),
      Number(editComision) || 0,
      Number(editTc) || 1,
    );
  }, [editLines, editComision, editTc]);

  function toggleItem(idx: number) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it));
  }

  function updateCant(idx: number, val: string) {
    const max = items[idx].maxCant;
    let n = Number(val) || 0;
    if (max <= 0) n = 0;
    else n = Math.max(1, Math.min(max, n));
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

  function handlePrintBoleta(boleta: Invoice, e: React.MouseEvent) {
    e.stopPropagation();
    const lines = boletaItems[boleta.id] || [];
    openInvoicePrintPreview({
      invoice: boleta,
      items: lines,
      title: boleta.id.includes('GAV') ? 'Boleta GAV Japon' : 'Boleta',
    });
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
                <TableHead className="w-10" />
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
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={(e) => handlePrintBoleta(b, e)}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Vista previa / Imprimir"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {b.estado === 'sin_pagar' && (
                            <button
                              onClick={(e) => openEditModal(b, e)}
                              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                              title="Editar boleta"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && lineItems.length > 0 && (
                      <TableRow key={`${b.id}-detail`} className="bg-secondary/30">
                        <TableCell colSpan={11}>
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
                          disabled={it.maxCant <= 0}
                        />
                      </td>
                      <td className="p-2 font-[family-name:var(--font-mono)] text-xs">{compra?.sku}</td>
                      <td className="p-2 max-w-[200px] truncate">{it.nombre}</td>
                      <td className="p-2 text-right"><PriceDisplay amount={it.precioU} currency="JPY" /></td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min={it.maxCant > 0 ? 1 : 0}
                          max={it.maxCant}
                          value={it.cant}
                          onChange={(e) => updateCant(idx, e.target.value)}
                          disabled={!it.selected || it.maxCant <= 0}
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

      {/* Modal Editar Boleta */}
      <Modal
        isOpen={!!editBoleta}
        onClose={() => setEditBoleta(null)}
        title={`Editar Boleta — ${editBoleta?.id ?? ''}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Comisión %"
              type="number"
              min="0"
              max="100"
              value={editComision}
              onChange={(e) => setEditComision(e.target.value)}
            />
            <Input
              label="Tipo de Cambio (TC)"
              type="number"
              min="0.01"
              step="0.1"
              value={editTc}
              onChange={(e) => setEditTc(e.target.value)}
            />
          </div>

          <p className="text-sm font-medium text-foreground">Líneas de la boleta:</p>
          <div className="max-h-[300px] overflow-y-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b border-border">
                <tr className="text-muted-foreground text-left">
                  <th className="p-2">Nombre</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2 text-right w-28">Precio ¥</th>
                  <th className="p-2 text-right w-20">Cant</th>
                  <th className="p-2 text-right">Subtotal ¥</th>
                </tr>
              </thead>
              <tbody>
                {editLines.map((li, idx) => (
                  <tr key={idx} className="border-t border-border/50 hover:bg-secondary/30">
                    <td className="p-2 max-w-[200px] truncate">{li.nombre}</td>
                    <td className="p-2 text-muted-foreground">{li.tipo}</td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={li.precioU}
                        onChange={(e) => updateEditLine(idx, 'precioU', e.target.value)}
                        className="w-24 px-2 py-1 text-right rounded bg-input-background border border-border text-foreground text-sm"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="1"
                        value={li.cant}
                        onChange={(e) => updateEditLine(idx, 'cant', e.target.value)}
                        className="w-16 px-2 py-1 text-right rounded bg-input-background border border-border text-foreground text-sm"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <PriceDisplay amount={li.precioU * li.cant} currency="JPY" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editPreview && (
            <Card padding="sm" className="bg-secondary/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ¥:</span>
                <PriceDisplay amount={editPreview.subtotalJPY} currency="JPY" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total ¥ (con {editComision}% comisión):</span>
                <PriceDisplay amount={editPreview.totalJPY} currency="JPY" />
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-muted-foreground">Total CLP:</span>
                <PriceDisplay amount={Math.round(editPreview.totalCLP)} currency="CLP" />
              </div>
            </Card>
          )}
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setEditBoleta(null)}>Cancelar</Button>
          <Button onClick={handleEditSubmit} disabled={editLines.length === 0}>
            Guardar cambios
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
