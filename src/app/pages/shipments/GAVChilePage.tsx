import { useEffect, useMemo, useState } from 'react';
import { FileText, Upload, X, Plus } from 'lucide-react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input, Select } from '../../components/design-system/Input';
import { Modal, ModalFooter } from '../../components/design-system/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { EmptyState } from '../../components/design-system/EmptyState';

type GavDocumento = {
  nombre: string;
  tipo: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
};

type GAVEntry = {
  id: number;
  periodo: string;
  concepto: string;
  monto: number;
  adjunto: boolean;
  estado: 'pendiente' | 'pagado';
  docTipo: 'factura' | 'boleta';
  ivaCredito: boolean;
  documentos: GavDocumento[];
  fechaPago: string | null;
};

type GavChileResponse = {
  data: GAVEntry[];
};

type GavConfirmResponse = {
  data: GAVEntry;
};

type GavCreateResponse = {
  data: GAVEntry;
};

async function shipmentsFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
  const response = await fetch(`/api/shipments/gav-chile${endpoint}`, {
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

async function uploadSupportFile(file: File): Promise<string> {
  const token = getAnyAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'No se pudo subir el archivo' }));
    throw new Error(data.error || response.statusText);
  }

  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error('Respuesta inválida al subir archivo');
  }
  return data.url;
}

export default function GAVChilePage() {
  const nowPeriod = new Date().toISOString().slice(0, 7);
  const [gavChile, setGavChile] = useState<GAVEntry[]>([]);
  const [periodo, setPeriodo] = useState(nowPeriod);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [docTipo, setDocTipo] = useState<'factura' | 'boleta'>('boleta');
  const [ivaCredito, setIvaCredito] = useState(false);

  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [docsTargetId, setDocsTargetId] = useState<number | null>(null);
  const [docNombre, setDocNombre] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTipoAdjunto, setDocTipoAdjunto] = useState<'boleta' | 'factura'>('boleta');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const selectedRow = useMemo(() => gavChile.find((row) => row.id === docsTargetId) || null, [gavChile, docsTargetId]);

  async function loadGavChile(targetPeriod: string) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await shipmentsFetch<GavChileResponse>(`?period=${encodeURIComponent(targetPeriod)}`);
      setGavChile(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar GAV Chile');
      setGavChile([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadGavChile(periodo);
  }, [periodo]);

  async function handleCreate() {
    const montoNumber = Number(monto);
    if (!concepto.trim()) {
      setToastMsg('Debes ingresar un concepto');
      setTimeout(() => setToastMsg(null), 2500);
      return;
    }
    if (!Number.isFinite(montoNumber) || montoNumber <= 0) {
      setToastMsg('Debes ingresar un monto válido');
      setTimeout(() => setToastMsg(null), 2500);
      return;
    }

    try {
      setCreating(true);
      const response = await shipmentsFetch<GavCreateResponse>('', {
        method: 'POST',
        body: JSON.stringify({
          periodo,
          concepto: concepto.trim(),
          monto: montoNumber,
          docTipo,
          ivaCredito,
        }),
      });
      setGavChile((prev) => [...prev, response.data]);
      setConcepto('');
      setMonto('');
      setDocTipo('boleta');
      setIvaCredito(false);
      setToastMsg('Gasto mensual creado');
      setTimeout(() => setToastMsg(null), 2200);
    } catch (e) {
      setToastMsg(e instanceof Error ? e.message : 'No se pudo crear el gasto');
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setCreating(false);
    }
  }

  function openDocsModal(id: number) {
    setDocsTargetId(id);
    setDocNombre('');
    setDocFile(null);
    setDocTipoAdjunto('boleta');
    setDocsModalOpen(true);
  }

  function closeDocsModal() {
    setDocsModalOpen(false);
    setDocsTargetId(null);
    setDocNombre('');
    setDocFile(null);
    setDocTipoAdjunto('boleta');
    setIsUploadingDoc(false);
  }

  async function handleUploadDocumento() {
    if (!selectedRow) return;
    if (!docNombre.trim()) {
      setToastMsg('Debes ingresar nombre del documento');
      setTimeout(() => setToastMsg(null), 2500);
      return;
    }
    if (!docFile) {
      setToastMsg('Debes seleccionar un archivo');
      setTimeout(() => setToastMsg(null), 2500);
      return;
    }

    try {
      setIsUploadingDoc(true);
      const fileUrl = await uploadSupportFile(docFile);
      const response = await shipmentsFetch<GavConfirmResponse>(`/${selectedRow.id}/documentos`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: docNombre.trim(),
          tipo: docTipoAdjunto,
          fileName: docFile.name,
          fileUrl,
        }),
      });
      setGavChile((prev) => prev.map((row) => (row.id === selectedRow.id ? response.data : row)));
      setDocNombre('');
      setDocFile(null);
      setToastMsg('Documento adjuntado');
      setTimeout(() => setToastMsg(null), 2200);
    } catch (e) {
      setToastMsg(e instanceof Error ? e.message : 'No se pudo adjuntar documento');
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setIsUploadingDoc(false);
    }
  }

  async function handleRemoveDocumento(id: number, fileName: string) {
    try {
      const response = await shipmentsFetch<GavConfirmResponse>(`/${id}/documentos/${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });
      setGavChile((prev) => prev.map((row) => (row.id === id ? response.data : row)));
      setToastMsg('Documento eliminado');
      setTimeout(() => setToastMsg(null), 2200);
    } catch (e) {
      setToastMsg(e instanceof Error ? e.message : 'No se pudo eliminar documento');
      setTimeout(() => setToastMsg(null), 3000);
    }
  }

  async function handleConfirm(id: number) {
    const row = gavChile.find((item) => item.id === id);
    if (!row || row.documentos.length === 0) {
      setToastMsg('Debe adjuntar comprobante antes de confirmar');
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    try {
      setError(null);
      const response = await shipmentsFetch<GavConfirmResponse>(`/${id}/confirmar`, {
        method: 'PUT',
        body: JSON.stringify({ adjunto: true }),
      });

      setGavChile((prev) => prev.map((g) => (g.id === id ? response.data : g)));
      setToastMsg('Gasto fijo confirmado');
      setTimeout(() => setToastMsg(null), 2500);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo confirmar el gasto fijo';
      setError(message);
      setToastMsg(message);
      setTimeout(() => setToastMsg(null), 3000);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Gastos Fijos Chile</h2>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-destructive/90 text-destructive-foreground px-4 py-3 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-top-2">
          {toastMsg}
        </div>
      )}

      {error && (
        <Card>
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <Input
            label="Periodo"
            type="month"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            style={{ colorScheme: 'dark' }}
          />
          <Input
            label="Concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej: Línea telefónica"
          />
          <Input
            label="Monto CLP"
            type="number"
            min={0}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          <Select label="Tipo documento" value={docTipo} onChange={(e) => setDocTipo(e.target.value as 'factura' | 'boleta')}>
            <option value="boleta">Boleta</option>
            <option value="factura">Factura</option>
          </Select>
          <Button onClick={handleCreate} disabled={creating}>
            <Plus className="w-4 h-4" /> {creating ? 'Creando...' : 'Crear gasto'}
          </Button>
        </div>
        <label className="inline-flex items-center gap-2 mt-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={ivaCredito}
            onChange={(e) => setIvaCredito(e.target.checked)}
            className="rounded border-border bg-input-background"
          />
          IVA crédito
        </label>
      </Card>

      {/* Table */}
      <Card padding="none">
        {isLoading ? (
          <EmptyState
            icon={FileText}
            title="Cargando gastos fijos"
            description="Obteniendo GAV Chile..."
          />
        ) : gavChile.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin gastos fijos"
            description="No hay gastos fijos registrados para Chile."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-center">Comprobante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Pago</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gavChile.map((g) => {
                return (
                  <TableRow key={g.id}>
                    <TableCell className="font-[family-name:var(--font-mono)] text-xs">{g.periodo}</TableCell>
                    <TableCell>{g.concepto}</TableCell>
                    <TableCell className="text-right">
                      <PriceDisplay amount={g.monto} currency="CLP" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button type="button" size="sm" variant="outline" onClick={() => openDocsModal(g.id)}>
                        {g.documentos.length} doc
                      </Button>
                    </TableCell>
                    <TableCell><StatusBadge status={g.estado} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {g.fechaPago || '—'}
                    </TableCell>
                    <TableCell>
                      {g.estado === 'pendiente' && (
                        <Button size="sm" variant="outline" onClick={() => handleConfirm(g.id)}>
                          Confirmar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={docsModalOpen}
        onClose={closeDocsModal}
        title={selectedRow ? `Documentos · ${selectedRow.concepto}` : 'Documentos'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Nombre del documento"
              value={docNombre}
              onChange={(e) => setDocNombre(e.target.value)}
              placeholder="Ej: Boleta línea telefónica"
            />
            <Select label="Tipo" value={docTipoAdjunto} onChange={(e) => setDocTipoAdjunto(e.target.value as 'boleta' | 'factura')}>
              <option value="boleta">Boleta</option>
              <option value="factura">Factura</option>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Archivo</label>
            <input
              type="file"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-input-background text-foreground"
            />
          </div>

          <div className="border border-border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
            {selectedRow && selectedRow.documentos.length > 0 ? (
              selectedRow.documentos.map((doc) => (
                <div key={`${doc.fileName}-${doc.fileUrl}`} className="flex items-center justify-between gap-3 p-2 rounded border border-border">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{doc.nombre}</p>
                    <p className="text-xs text-muted-foreground">{doc.tipo} · {doc.fileName}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                      <Button type="button" size="sm" variant="ghost">
                        <Upload className="w-4 h-4" />
                      </Button>
                    </a>
                    <Button type="button" size="sm" variant="ghost" onClick={() => selectedRow && handleRemoveDocumento(selectedRow.id, doc.fileName)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No hay documentos adjuntos.</p>
            )}
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={closeDocsModal}>Cerrar</Button>
          <Button onClick={handleUploadDocumento} disabled={isUploadingDoc || !selectedRow}>
            <Upload className="w-4 h-4" /> {isUploadingDoc ? 'Subiendo...' : 'Adjuntar documento'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
