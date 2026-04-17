import { useMemo } from 'react';
import { AlertTriangle, Receipt, Building2, Smartphone } from 'lucide-react';
import { useShipmentsData } from '../../contexts/ShipmentsDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/design-system/Table';
import { PriceDisplay } from '../../components/shipments/PriceDisplay';
import { StatusBadge } from '../../components/shipments/StatusBadge';

export default function GAVJaponPage() {
  const { boletas, config, generateGAVBoleta } = useShipmentsData();

  const now = new Date();
  const currentMonth = now.toLocaleString('es-CL', { month: 'long', year: 'numeric' });

  // Check if GAV invoice exists for current month
  const hasCurrentMonthGAV = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    return boletas.some((b) => {
      if (!b.id.includes('GAV')) return false;
      const d = new Date(b.fecha);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [boletas, now]);

  const showWarning = now.getDate() >= 3 && !hasCurrentMonthGAV;

  // Last 6 months history
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
        const d = new Date(b.fecha);
        return d.getFullYear() === m.year && d.getMonth() === m.month;
      });
      return {
        mes: m.label,
        boletaId: invoice?.id || '—',
        total: invoice?.totalCLP || 0,
        totalJPY: invoice?.totalJPY || 0,
        estado: invoice?.estado || 'pendiente',
        hasInvoice: !!invoice,
      };
    });
  }, [boletas, now]);

  function handleGenerar() {
    generateGAVBoleta();
  }

  const totalMensualJPY = config.arrBodegaJP + config.appBeyblade;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Gastos Fijos Japón</h2>
        <Button size="sm" onClick={handleGenerar} disabled={hasCurrentMonthGAV}>
          <Receipt className="w-4 h-4" /> Generar Boleta
        </Button>
      </div>

      {/* Warning alert */}
      {showWarning && (
        <Card padding="sm" className="border-amber-400 bg-amber-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Boleta GAV pendiente</p>
              <p className="text-xs text-amber-700">
                No se ha generado la boleta de gastos fijos para {currentMonth}. Genera la boleta para mantener los registros al día.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Fixed expenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-secondary">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Arriendo Bodega</p>
              <PriceDisplay amount={config.arrBodegaJP} currency="JPY" className="text-2xl font-bold" />
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
              <PriceDisplay amount={config.appBeyblade} currency="JPY" className="text-2xl font-bold" />
              <p className="text-xs text-muted-foreground mt-1">por mes</p>
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

      {/* History table */}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((h) => (
              <TableRow key={h.mes}>
                <TableCell className="capitalize">{h.mes}</TableCell>
                <TableCell className="font-[family-name:var(--font-mono)] text-xs">
                  {h.boletaId}
                </TableCell>
                <TableCell className="text-right">
                  {h.hasInvoice ? <PriceDisplay amount={h.totalJPY} currency="JPY" /> : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {h.hasInvoice ? <PriceDisplay amount={h.total} currency="CLP" /> : '—'}
                </TableCell>
                <TableCell>
                  {h.hasInvoice ? (
                    <StatusBadge status={h.estado} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin boleta</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
