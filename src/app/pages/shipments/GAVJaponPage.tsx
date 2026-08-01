import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Receipt, Building2, Smartphone, Percent, Save, CheckCircle, Pencil, Printer } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Modal, ModalFooter } from '../../components/design-system/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';
import { calcInvoiceTotals, type Invoice, type InvoiceItem } from '../../data/shipmentsMockData';
import { openInvoicePrintPreview } from '../../lib/invoicePrint';

interface EditableLine {
  nombre: string;
  ean: string;
  tipo: string;
  precioU: number;
  cant: number;
}

function getInvoiceYearMonthUTC(fecha: string): { year: number; month: number } | null {
  const raw = String(fecha ?? '').trim();
  if (!raw) return null;

  const isNumeric = /^\d+$/.test(raw);
  const parsed = isNumeric
    ? new Date(Number(raw))
    : new Date(raw.length === 10 ? `${raw}T00:00:00Z` : raw);

  if (Number.isNaN(parsed.getTime())) return null;

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth(),
  };
}

export default function GAVJaponPage() {
  const { boletas, boletaItems, compras, config, updateConfig, generateGAVBoleta, updateBoleta } = useShipmentsData();

  const tcReferencia = compras.length > 0 ? (compras[compras.length - 1].tc || 6.0) : 6.0;
  const now = new Date();
  const currentMonth = now.toLocaleString('es-CL', { month: 'long', year: 'numeric' });

  const [arrBodegaJP, setArrBodegaJP] = useState<number>(config.arrBodegaJP);
  const [appBeyblade, setAppBeyblade] = useState<number>(config.appBeyblade);
  const [comisionPct, setComisionPct] = useState<number>(config.comisionPct);
  const [saved, setSaved] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [tc, setTc] = useState<number>(tcReferencia);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [generating, setGenerating] = useState(false);
  const [selectedYear, selectedMonth] = useMemo(() => {
    const [yearText, monthText] = period.split('-');
    const y = Number(yearText);
    const m = Number(monthText);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
      return [null, null] as const;
    }
    return [y, m - 1] as const;
  }, [period]);

  const selectedPeriodDate = useMemo(() => {
    if (selectedYear === null || selectedMonth === null) return null;
    return new Date(selectedYear, selectedMonth, 1);
  }, [selectedYear, selectedMonth]);

  const selectedPeriodLabel = selectedPeriodDate
    ? selectedPeriodDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' })
    : 'periodo inválido';

  const hasSelectedPeriodGAV = useMemo(() => {
    if (selectedYear === null || selectedMonth === null) return false;
    return boletas.some((b) => {
      if (!b.id.includes('GAV')) return false;
      const ym = getInvoiceYearMonthUTC(b.fecha);
      return !!ym && ym.year === selectedYear && ym.month === selectedMonth;
    });
  }, [boletas, selectedYear, selectedMonth]);


  const [editBoleta, setEditBoleta] = useState<Invoice | null>(null);
  const [editComision, setEditComision] = useState('');
  const [editTc, setEditTc] = useState('');
  const [editLines, setEditLines] = useState<EditableLine[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    setArrBodegaJP(config.arrBodegaJP);
    setAppBeyblade(config.appBeyblade);
    setComisionPct(config.comisionPct);
  }, [config.arrBodegaJP, config.appBeyblade, config.comisionPct]);

  const hasCurrentMonthGAV = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    return boletas.some((b) => {
      if (!b.id.includes('GAV')) return false;
      const ym = getInvoiceYearMonthUTC(b.fecha);
      return !!ym && ym.year === year && ym.month === month;
    });
  }, [boletas, now]);

  const showWarning = now.getDate() >= 3 && !hasCurrentMonthGAV;

  const history = useMemo(() => {
    const months: { label: string; year: number; month: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('es-CL', { month: 'long', year: 'numeric' }),
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    return months.map((m) => {
      const invoice = boletas.find((b) => {
        if (!b.id.includes('GAV')) return false;
        const ym = getInvoiceYearMonthUTC(b.fecha);
        return !!ym && ym.year === m.year && ym.month === m.month;
      });

      return {
        mes: m.label,
        boletaId: invoice?.id || '—',
        totalCLP: invoice?.totalCLP || 0,
        totalJPY: invoice?.totalJPY || 0,
        estado: invoice?.estado || 'sin_pagar',
        hasInvoice: !!invoice,
        invoice,
      };
    });
  }, [boletas, now]);

  const totalMensualJPY = arrBodegaJP + appBeyblade;
  const totalConComisionJPY = Math.round(totalMensualJPY * (1 + comisionPct / 100));
  const totalEstimadoCLP = Math.round(totalConComisionJPY * tcReferencia);

  const editPreview = useMemo(() => {
    if (editLines.length === 0) return null;
    return calcInvoiceTotals(
      editLines.map((line) => ({ precioU: line.precioU, cant: line.cant })),
      Number(editComision) || 0,
      Number(editTc) || 1,
    );
  }, [editLines, editComision, editTc]);

  function getGavLines(boleta: Invoice): InvoiceItem[] {
    const lines = boletaItems[boleta.id] || [];
    if (lines.length > 0) return lines;
    return [
      {
        fecha: boleta.fecha,
        tipo: 'Arriendo/App',
        nombre: 'Gastos fijos Japon',
        ean: '',
        precioU: boleta.subtotalJPY,
        cant: 1,
        comPct: boleta.comision,
        tc: boleta.tc,
      },
    ];
  }

  function handleGenerar() {
    setGenerateError(null);
    setTc(tcReferencia);
    setPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    setModalOpen(true);
  }

  async function handleConfirmarGenerar() {
    if (!selectedPeriodDate) return;
    setGenerating(true);
    setGenerateError(null);

    const configResult = await updateConfig({ arrBodegaJP, appBeyblade, comisionPct });
    if (!configResult.ok) {
      setGenerateError(configResult.error);
      setGenerating(false);
      return;
    }

    try {
      await generateGAVBoleta({
        year: selectedPeriodDate.getFullYear(),
        month: selectedPeriodDate.getMonth() + 1,
        tc,
      });
      setModalOpen(false);
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'No se pudo generar la boleta GAV');
    } finally {
      setGenerating(false);
    }
  }

  function handleGuardarParametros() {
    updateConfig({ arrBodegaJP, appBeyblade, comisionPct });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function openEditModal(boleta: Invoice) {
    const lines = getGavLines(boleta).map((line) => ({
      nombre: line.nombre,
      ean: line.ean,
      tipo: line.tipo,
      precioU: line.precioU,
      cant: line.cant,
    }));
    setEditBoleta(boleta);
    setEditComision(String(boleta.comision));
    setEditTc(String(boleta.tc));
    setEditLines(lines);
  }

  function updateEditLine(idx: number, field: 'precioU' | 'cant', value: string) {
    setEditLines((prev) => prev.map((line, i) => {
      if (i !== idx) return line;
      if (field === 'precioU') {
        return { ...line, precioU: Math.max(0, Number(value) || 0) };
      }
      return { ...line, cant: Math.max(1, Number(value) || 1) };
    }));
  }

  async function handleEditSubmit() {
    if (!editBoleta) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updateBoleta(editBoleta.id, {
        comisionPct: Number(editComision) || 0,
        tc: Number(editTc) || 1,
        items: editLines,
      });
      setEditBoleta(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'No se pudo guardar la boleta');
    } finally {
      setEditSaving(false);
    }
  }

  function handlePrintBoleta(boleta: Invoice) {
    openInvoicePrintPreview({
      invoice: boleta,
      items: getGavLines(boleta),
      title: 'Boleta GAV Japon',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Gastos Fijos Japón</h2>
        <Button size="sm" onClick={handleGenerar}>
          <Receipt className="w-4 h-4" /> Generar Boleta
        </Button>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Confirmar generación de boleta GAV" size="md">
        <div className="space-y-4">
          {generateError && (
            <div className="rounded-lg border border-red-400/50 bg-red-500/10 p-3 text-sm text-red-200">
              {generateError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Mes/Año de la boleta"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
            <div>
              <p className="text-sm text-muted-foreground">Periodo seleccionado</p>
              <p className="text-lg font-semibold capitalize text-foreground">{selectedPeriodLabel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Arriendo Bodega JP</p>
              <PriceDisplay amount={arrBodegaJP} currency="JPY" className="text-lg font-semibold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">App Beyblade</p>
              <PriceDisplay amount={appBeyblade} currency="JPY" className="text-lg font-semibold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Comisión</p>
              <span className="text-lg font-semibold">{comisionPct}%</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subtotal mensual</p>
              <PriceDisplay amount={totalMensualJPY} currency="JPY" className="text-lg font-semibold" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total con comisión</p>
              <PriceDisplay amount={totalConComisionJPY} currency="JPY" className="text-lg font-semibold" />
            </div>
            <Input
              label="Tipo de cambio (TC)"
              type="number"
              min={0}
              step="0.01"
              value={tc}
              onChange={(e) => setTc(Number(e.target.value) || 0)}
            />
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Total estimado CLP</p>
              <PriceDisplay amount={Math.round(totalConComisionJPY * tc)} currency="CLP" className="text-lg font-semibold" />
            </div>
            {hasSelectedPeriodGAV && (
              <div className="col-span-2 rounded-lg border border-[#ffab00]/40 bg-[#ffab00]/10 p-3">
                <p className="text-sm text-[#ffab00]">
                  Ya existe una boleta GAV para este período. Si confirmas, el backend bloqueará la duplicación.
                </p>
              </div>
            )}
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={generating}>Cancelar</Button>
          <Button onClick={handleConfirmarGenerar} disabled={generating || tc <= 0 || !selectedPeriodDate || hasSelectedPeriodGAV}>
            {generating ? 'Generando...' : 'Confirmar y generar'}
          </Button>
        </ModalFooter>
      </Modal>

      {showWarning && (
        <Card padding="sm" className="border-[#ffab00]/30 bg-[#ffab00]/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ffab00] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#ffab00]">Boleta GAV pendiente</p>
              <p className="text-xs text-[#ffab00]/80">
                No se ha generado la boleta de gastos fijos para {currentMonth}. Genera la boleta para mantener los registros al día.
              </p>
            </div>
          </div>
        </Card>
      )}

      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-[#00e676]/90 text-black px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" /> Parámetros GAV guardados
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Parámetros GAV Japón</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Arriendo Bodega JP (¥)"
              type="number"
              min={0}
              value={arrBodegaJP}
              onChange={(e) => setArrBodegaJP(Number(e.target.value) || 0)}
            />
            <Input
              label="App Beyblade (¥)"
              type="number"
              min={0}
              value={appBeyblade}
              onChange={(e) => setAppBeyblade(Number(e.target.value) || 0)}
            />
            <Input
              label="Comisión (%)"
              type="number"
              min={0}
              step="0.1"
              value={comisionPct}
              onChange={(e) => setComisionPct(Number(e.target.value) || 0)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Subtotal mensual</p>
              <PriceDisplay amount={totalMensualJPY} currency="JPY" className="text-base font-semibold" />
            </div>
            <div className="rounded-lg border border-border p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Total con comisión</p>
              <PriceDisplay amount={totalConComisionJPY} currency="JPY" className="text-base font-semibold" />
            </div>
            <div className="rounded-lg border border-border p-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Estimado CLP (TC ref. {tcReferencia})</p>
              <PriceDisplay amount={totalEstimadoCLP} currency="CLP" className="text-base font-semibold" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleGuardarParametros}>
              <Save className="w-4 h-4" /> Guardar parámetros
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-secondary">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Arriendo Bodega</p>
              <PriceDisplay amount={arrBodegaJP} currency="JPY" className="text-2xl font-bold" />
              <p className="text-xs text-muted-foreground mt-1">por mes</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-secondary">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">App Beyblade</p>
              <PriceDisplay amount={appBeyblade} currency="JPY" className="text-2xl font-bold" />
              <p className="text-xs text-muted-foreground mt-1">por mes</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-secondary">
              <Percent className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Comisión</p>
              <p className="text-2xl font-bold text-foreground">{comisionPct}%</p>
              <p className="text-xs text-muted-foreground mt-1">aplicada a la boleta GAV</p>
            </div>
          </div>
        </Card>
      </div>

      <Card padding="sm" className="bg-secondary/30">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total mensual</span>
          <PriceDisplay amount={totalMensualJPY} currency="JPY" className="text-lg font-semibold" />
        </div>
      </Card>

      <Card padding="none">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Historial — Últimos 6 meses</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead>Boleta ID</TableHead>
              <TableHead className="text-right">Total ¥</TableHead>
              <TableHead className="text-right">Total CLP</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((h) => (
              <TableRow key={h.mes}>
                <TableCell className="capitalize">{h.mes}</TableCell>
                <TableCell className="font-[family-name:var(--font-mono)] text-xs">{h.boletaId}</TableCell>
                <TableCell className="text-right">
                  {h.hasInvoice ? <PriceDisplay amount={h.totalJPY} currency="JPY" /> : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {h.hasInvoice ? <PriceDisplay amount={h.totalCLP} currency="CLP" /> : '—'}
                </TableCell>
                <TableCell>
                  {h.hasInvoice ? <StatusBadge status={h.estado} /> : <span className="text-xs text-muted-foreground">Sin boleta</span>}
                </TableCell>
                <TableCell className="text-right">
                  {h.invoice ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handlePrintBoleta(h.invoice as Invoice)}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Vista previa / Imprimir"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {h.invoice.estado === 'sin_pagar' && (
                        <button
                          onClick={() => openEditModal(h.invoice as Invoice)}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Editar boleta"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={!!editBoleta}
        onClose={() => { setEditBoleta(null); setEditError(null); }}
        title={`Editar Boleta GAV — ${editBoleta?.id ?? ''}`}
        size="md"
      >
        <div className="space-y-4">
          {editError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {editError}
            </div>
          )}
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
          <div className="max-h-[220px] overflow-y-auto border border-border rounded-lg">
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
                {editLines.map((line, idx) => (
                  <tr key={`${line.nombre}-${idx}`} className="border-t border-border/50 hover:bg-secondary/30">
                    <td className="p-2 max-w-[220px] truncate">{line.nombre}</td>
                    <td className="p-2 text-muted-foreground">{line.tipo}</td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={line.precioU}
                        onChange={(e) => updateEditLine(idx, 'precioU', e.target.value)}
                        className="w-24 px-2 py-1 text-right rounded bg-input-background border border-border text-foreground text-sm"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="1"
                        value={line.cant}
                        onChange={(e) => updateEditLine(idx, 'cant', e.target.value)}
                        className="w-16 px-2 py-1 text-right rounded bg-input-background border border-border text-foreground text-sm"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <PriceDisplay amount={line.precioU * line.cant} currency="JPY" />
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
          <Button variant="ghost" onClick={() => { setEditBoleta(null); setEditError(null); }}>Cancelar</Button>
          <Button onClick={handleEditSubmit} disabled={editLines.length === 0 || editSaving}>
            {editSaving ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
