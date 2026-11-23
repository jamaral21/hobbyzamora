import { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, CreditCard, ExternalLink, Loader2, Search } from 'lucide-react';
import { Link } from 'react-router';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { paymentsAPI, type GetnetPaymentLog } from '../../lib/api';
import { formatChileDateTime } from '../../lib/chileDate';

const EVENT_FILTERS = [
  { value: '', label: 'Todos los eventos' },
  { value: 'PAYMENT_REJECTED', label: 'Pagos rechazados' },
  { value: 'PAYMENT_APPROVED', label: 'Pagos aprobados' },
  { value: 'SESSION_CREATE_ERROR', label: 'Errores al iniciar pago' },
  { value: 'QUERY_ERROR', label: 'Errores de consulta' },
  { value: 'CALLBACK_ERROR', label: 'Errores de callback' },
  { value: 'SESSION_CREATED', label: 'Sesiones iniciadas' },
  { value: 'UNRECOGNIZED_STATUS', label: 'Estados no reconocidos' },
  { value: 'LEGACY_DECLINED', label: 'Rechazos anteriores sin diagnóstico' },
];

function eventLabel(event: string): string {
  return EVENT_FILTERS.find((filter) => filter.value === event)?.label ?? event.replaceAll('_', ' ');
}

function eventVariant(event: string): 'success' | 'danger' | 'warning' | 'info' {
  if (event === 'PAYMENT_APPROVED') return 'success';
  if (event === 'PAYMENT_REJECTED' || event.endsWith('_ERROR')) return 'danger';
  return 'warning';
}

export default function GetnetPaymentsPage() {
  const [logs, setLogs] = useState<GetnetPaymentLog[]>([]);
  const [search, setSearch] = useState('');
  const [event, setEvent] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    paymentsAPI.getnetLogs({ search: search.trim() || undefined, event: event || undefined, page, limit: 25 })
      .then((result) => {
        if (!active) return;
        setLogs(result.logs);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los registros Getnet.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [search, event, page]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Conciliación · pasarela</p>
          <h1 className="text-3xl text-foreground mb-1">Pagos Getnet</h1>
          <p className="text-sm text-muted-foreground">
            Respuestas del procesador y errores registrados al iniciar, consultar o confirmar pagos.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(inputEvent) => handleSearch(inputEvent.target.value)}
              placeholder="Buscar orden, código, mensaje o ID Getnet"
              className="w-full rounded-lg border border-border bg-input-background py-2.5 pl-9 pr-3 text-sm text-foreground"
            />
          </label>
          <select
            value={event}
            onChange={(inputEvent) => { setEvent(inputEvent.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm text-foreground"
          >
            {EVENT_FILTERS.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
        </div>

        <Card padding="none">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Bitácora de transacciones</span>
            </div>
            <span className="text-xs text-muted-foreground">{total} registros</span>
          </div>

          {error && (
            <div role="alert" className="m-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !error && logs.length === 0 ? (
            <div className="py-16 text-center">
              <CreditCard className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aún no hay registros Getnet para este filtro.</p>
            </div>
          ) : !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Orden / referencia</TableHead>
                  <TableHead>Código y respuesta</TableHead>
                  <TableHead>Error técnico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => <LogRow key={log.id} log={log} />)}
              </TableBody>
            </Table>
          )}
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => current - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages || isLoading} onClick={() => setPage((current) => current + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function LogRow({ log }: { log: GetnetPaymentLog }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {formatChileDateTime(log.createdAt)}
      </TableCell>
      <TableCell>
        <Badge variant={eventVariant(log.event)} size="sm">{eventLabel(log.event)}</Badge>
        {log.gatewayStatus && <p className="mt-1 text-xs text-muted-foreground">{log.gatewayStatus}</p>}
      </TableCell>
      <TableCell>
        {log.orderNumber ? (
          <div className="space-y-1">
            {log.orderId ? (
              <Link to={`/admin/orders/${log.orderId}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                {log.orderNumber}<ExternalLink className="h-3 w-3" />
              </Link>
            ) : <span className="text-sm text-foreground">{log.orderNumber}</span>}
            {log.requestId && <p className="font-mono text-xs text-muted-foreground">Getnet {log.requestId}</p>}
          </div>
        ) : log.requestId ? (
          <span className="font-mono text-xs text-muted-foreground">{log.requestId}</span>
        ) : '—'}
      </TableCell>
      <TableCell className="min-w-56">
        {log.responseCode && <p className="font-mono text-sm text-foreground">Código {log.responseCode}</p>}
        {log.responseMessage && <p className="mt-1 max-w-md whitespace-normal text-xs text-muted-foreground">{log.responseMessage}</p>}
        {!log.responseCode && !log.responseMessage && <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="min-w-48 max-w-sm whitespace-normal text-xs text-destructive">
        {log.errorMessage || '—'}
      </TableCell>
    </TableRow>
  );
}
