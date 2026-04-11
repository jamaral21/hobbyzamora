import { useState, useRef } from 'react';
import { Plus, Download, AlertTriangle, Loader2, X, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { InventoryTable, FlatBatch } from '../../components/admin/InventoryTable';
import { Card, CardContent } from '../../components/design-system/Card';
import { Modal } from '../../components/design-system/Modal';
import { Input, Select } from '../../components/design-system/Input';
import { useInventory, useDashboardStats, useProducts, useMutation } from '../../hooks/useData';
import { inventoryAPI } from '../../lib/api';

export default function InventoryPage() {
  const { data: inventoryData, isLoading: inventoryLoading, refetch } = useInventory();
  const { data: stats, isLoading: statsLoading } = useDashboardStats(undefined, undefined);
  const { data: products } = useProducts();
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({ productId: '', quantity: '', unitCost: '' });
  const receiveBatch = useMutation(inventoryAPI.receive);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (inventoryLoading || statsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const inventory = (inventoryData as any)?.inventory || [];
  const summary = (inventoryData as any)?.summary || {};

  // Flatten batches for the table
  const flatBatches: FlatBatch[] = inventory.flatMap((item: any) =>
    (item.batches || []).map((batch: any) => ({
      id: batch.id,
      productName: item.productName,
      productSku: item.productSku,
      batchCode: batch.batchCode,
      quantity: batch.quantity,
      remaining: batch.remaining,
      unitCost: batch.unitCost,
      receivedAt: batch.receivedAt,
    }))
  );

  const totalItems = inventory.reduce((sum: number, item: any) => sum + (item.totalQuantity || 0), 0);

  const handleExport = () => {
    const headers = ['Product', 'SKU', 'Batch', 'Remaining', 'Unit Cost', 'Total Value', 'Date'];
    const rows = flatBatches.map(b => [
      b.productName,
      b.productSku,
      b.batchCode,
      b.remaining,
      b.unitCost.toFixed(2),
      (b.remaining * b.unitCost).toFixed(2),
      new Date(b.receivedAt).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
        else { current += char; }
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return row;
    });
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setImportResult({ created: 0, skipped: 0, errors: ['El archivo CSV está vacío o no tiene datos.'] });
        return;
      }
      const result = await inventoryAPI.importCSV(rows);
      setImportResult(result);
      refetch();
    } catch (err: any) {
      setImportResult({ created: 0, skipped: 0, errors: [err?.message || 'Error al importar'] });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const header = 'sku,quantity,unitCost';
    const example = 'HBZ-001,50,25.00';
    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-inventario.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddBatch = async () => {
    if (!batchForm.productId || !batchForm.quantity || !batchForm.unitCost) return;
    try {
      await receiveBatch.mutate(
        batchForm.productId,
        parseInt(batchForm.quantity),
        parseFloat(batchForm.unitCost)
      );
      setIsAddBatchOpen(false);
      setBatchForm({ productId: '', quantity: '', unitCost: '' });
      refetch();
    } catch (err) {
      console.error('Add batch failed:', err);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl text-foreground mb-2">Inventario</h1>
            <p className="text-muted-foreground">
              Rastrea y gestiona tus niveles de stock
            </p>
          </div>
          <div className="flex gap-3">
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4" />
              Plantilla CSV
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isImporting ? 'Importando...' : 'Importar CSV'}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button onClick={() => setIsAddBatchOpen(true)}>
              <Plus className="w-4 h-4" />
              Agregar Lote
            </Button>
          </div>
        </div>

        {/* Import Result Banner */}
        {importResult && (
          <div className={`mb-4 p-4 rounded-lg border ${
            importResult.errors.length > 0 && importResult.created === 0
              ? 'bg-destructive/10 border-destructive/20'
              : importResult.errors.length > 0
              ? 'bg-[#ffab00]/10 border-[#ffab00]/20'
              : 'bg-[#00e676]/10 border-[#00e676]/20'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {importResult.created > 0 ? (
                  <CheckCircle className="w-5 h-5 text-[#00e676] mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {importResult.created} lote(s) importado(s){importResult.skipped > 0 ? `, ${importResult.skipped} omitido(s)` : ''}
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-1 text-sm text-muted-foreground list-disc list-inside">
                      {importResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                      {importResult.errors.length > 5 && <li>...y {importResult.errors.length - 5} error(es) más</li>}
                    </ul>
                  )}
                </div>
              </div>
              <button onClick={() => setImportResult(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-1">Valor Total del Inventario</p>
              <p className="text-2xl text-foreground">
                ${(summary.totalValue || stats?.inventoryValue || 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-1">Total de Artículos</p>
              <p className="text-2xl text-foreground">
                {totalItems}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-1" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Alertas de Stock Bajo</p>
                <p className="text-2xl text-foreground">
                  {summary.lowStockCount || stats?.lowStockItems || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inventory Table */}
      <InventoryTable inventory={flatBatches} />

      {/* Add Batch Modal */}
      <Modal isOpen={isAddBatchOpen} onClose={() => setIsAddBatchOpen(false)} size="md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-foreground">Agregar Lote de Inventario</h2>
            <button onClick={() => setIsAddBatchOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <Select
              label="Producto"
              value={batchForm.productId}
              onChange={(e) => setBatchForm({ ...batchForm, productId: e.target.value })}
              required
            >
              <option value="">Selecciona un producto...</option>
              {(products || []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </Select>
            <Input
              label="Cantidad"
              type="number"
              min="1"
              value={batchForm.quantity}
              onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
              required
            />
            <Input
              label="Costo Unitario ($)"
              type="number"
              step="0.01"
              min="0"
              value={batchForm.unitCost}
              onChange={(e) => setBatchForm({ ...batchForm, unitCost: e.target.value })}
              required
            />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsAddBatchOpen(false)} fullWidth>
                Cancelar
              </Button>
              <Button onClick={handleAddBatch} fullWidth disabled={receiveBatch.isLoading}>
                {receiveBatch.isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Agregando...</>
                ) : (
                  'Agregar Lote'
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
