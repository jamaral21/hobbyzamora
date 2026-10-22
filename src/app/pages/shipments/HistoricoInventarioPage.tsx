import { useEffect, useState } from 'react';
import { FileUp, Link2, RefreshCw } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { Input, Select, Textarea } from '../../components/design-system/Input';
import { Card } from '../../components/design-system/Card';
import { shipmentsFetch } from '../../contexts/ShipmentsDataContext';
import { parseReconciliationCsv } from '../../data/reconciliationCsv';

type HistoricalLot = { id: string; boxId: string | null; receivedAt: string; disposition: string; quantity: number; remaining: number; unitCost: number; productId: string | null };
type HistoricalGroup = { ean: string | null; product: { id: string; sku: string; name: string } | null; received: number; sellableStock: number; lots: HistoricalLot[] };

export default function HistoricoInventarioPage() {
  const [rows, setRows] = useState<HistoricalGroup[]>([]);
  const [ean, setEan] = useState('');
  const [productId, setProductId] = useState('');
  const [csv, setCsv] = useState('');
  const [message, setMessage] = useState('');
  const [manual, setManual] = useState({ nombre: '', ean: '', type: 'VENDIDO_HISTORICO', quantity: '', occurredAt: new Date().toISOString().slice(0, 10), reason: '' });

  const load = async () => {
    try {
      const response = await shipmentsFetch<{ data: HistoricalGroup[] }>(`/historico-inventario${ean.trim() ? `?ean=${encodeURIComponent(ean.trim())}` : ''}`);
      setRows(response.data);
      setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo cargar el histórico'); }
  };
  useEffect(() => { void load(); }, []);

  const synchronize = async () => {
    try {
      await shipmentsFetch('/historico-inventario/sincronizar', { method: 'POST', body: JSON.stringify({ ean, productId }) });
      setMessage('Lotes históricos asociados sin modificar ventas ni costos de otros lotes.');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo asociar'); }
  };

  const importCsv = async () => {
    try {
      const rowsToImport = parseReconciliationCsv(csv);
      await shipmentsFetch('/historico-inventario/conciliaciones/importar', { method: 'POST', body: JSON.stringify({ rows: rowsToImport }) });
      setMessage('Conciliación CSV importada. No se creó stock ni órdenes ficticias.');
      setCsv('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'CSV inválido'); }
  };

  const saveManual = async () => {
    try {
      await shipmentsFetch('/historico-inventario/conciliaciones', { method: 'POST', body: JSON.stringify({ ...manual, quantity: Number(manual.quantity) }) });
      setMessage('Conciliación registrada sin crear stock ni órdenes ficticias.');
      setManual({ ...manual, nombre: '', ean: '', quantity: '', reason: '' });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo registrar la conciliación'); }
  };

  return <div className="space-y-6">
    <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-foreground">Histórico por EAN/JAN</h2><Button variant="ghost" onClick={() => void load()}><RefreshCw className="w-4 h-4" /> Actualizar</Button></div>
    <Card padding="md"><div className="grid gap-3 md:grid-cols-[1fr_auto]"><Input label="EAN / JAN" value={ean} onChange={(event) => setEan(event.target.value)} placeholder="Ej: 4904810234567" /><Button onClick={() => void load()}>Buscar</Button></div></Card>
    <Card padding="md"><div className="grid gap-3 md:grid-cols-3"><Input label="EAN/JAN histórico" value={ean} onChange={(event) => setEan(event.target.value)} /><Input label="ID del producto existente" value={productId} onChange={(event) => setProductId(event.target.value)} /><Button onClick={() => void synchronize()} disabled={!ean || !productId}><Link2 className="w-4 h-4" /> Asociar lotes</Button></div></Card>
    <Card padding="md"><Textarea label="Conciliación CSV" value={csv} onChange={(event) => setCsv(event.target.value)} placeholder="nombre,type,quantity,occurredAt,ean,reason\nProducto,VENDIDO_HISTORICO,-2,2024-02-01,4904810234567,Venta previa" /><Button className="mt-3" onClick={() => void importCsv()} disabled={!csv.trim()}><FileUp className="w-4 h-4" /> Importar CSV</Button></Card>
    <Card padding="md"><p className="mb-3 text-sm font-medium text-foreground">Conciliación manual</p><div className="grid gap-3 md:grid-cols-3"><Input label="Producto" value={manual.nombre} onChange={(event) => setManual({ ...manual, nombre: event.target.value })} /><Input label="EAN/JAN" value={manual.ean} onChange={(event) => setManual({ ...manual, ean: event.target.value })} /><Select label="Tipo" value={manual.type} onChange={(event) => setManual({ ...manual, type: event.target.value })}><option value="VENDIDO_HISTORICO">Vendido histórico</option><option value="AJUSTE_HISTORICO">Ajuste histórico</option><option value="COLECCION">Colección</option><option value="USO_PERSONAL">Uso personal</option></Select><Input label="Cantidad" type="number" value={manual.quantity} onChange={(event) => setManual({ ...manual, quantity: event.target.value })} /><Input label="Fecha" type="date" value={manual.occurredAt} onChange={(event) => setManual({ ...manual, occurredAt: event.target.value })} /><Input label="Motivo" value={manual.reason} onChange={(event) => setManual({ ...manual, reason: event.target.value })} /></div><Button className="mt-3" onClick={() => void saveManual()} disabled={!manual.nombre || !manual.quantity}>Registrar conciliación</Button></Card>
    {message && <p className="text-sm text-muted-foreground">{message}</p>}
    <div className="space-y-3">{rows.map((row) => <Card key={row.ean || row.lots[0]?.id} padding="md"><div className="flex justify-between gap-4"><div><p className="font-medium text-foreground">{row.product?.name || 'Producto sin asociar'}</p><p className="text-sm text-muted-foreground">EAN/JAN: {row.ean || 'Sin EAN'} · Recibidas: {row.received} · Stock vendible: {row.sellableStock}</p></div></div><div className="mt-3 space-y-1 text-sm">{row.lots.map((lot) => <p key={lot.id}>{lot.boxId || 'Sin caja'} · {lot.disposition} · {lot.quantity} u. · ${lot.unitCost.toLocaleString('es-CL')} · saldo {lot.remaining}</p>)}</div></Card>)}</div>
  </div>;
}