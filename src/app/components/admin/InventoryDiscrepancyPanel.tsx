import { AlertTriangle, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../design-system/Table';
import { clsx } from 'clsx';
import type { ProductInventoryInfo } from '../../lib/api';

export interface InventoryDiscrepancyPanelProps {
  data: ProductInventoryInfo[];
  error?: string | null;
}

function getRowStyle(discrepancy: number) {
  if (discrepancy > 0) return { bg: 'bg-red-500/10', text: 'text-red-400' };
  if (discrepancy < 0) return { bg: 'bg-amber-500/10', text: 'text-amber-400' };
  return { bg: 'bg-[#00e676]/10', text: 'text-[#00e676]' };
}

function DiscrepancyIcon({ discrepancy }: { discrepancy: number }) {
  if (discrepancy > 0) return <AlertTriangle className="w-4 h-4 text-red-400" />;
  if (discrepancy < 0) return <AlertCircle className="w-4 h-4 text-amber-400" />;
  return <CheckCircle className="w-4 h-4 text-[#00e676]" />;
}

export function InventoryDiscrepancyPanel({ data, error }: InventoryDiscrepancyPanelProps) {
  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">Error al cargar discrepancia de inventario: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) return null;

  const totals = data.reduce(
    (acc, p) => ({
      currentStock: acc.currentStock + p.currentStock,
      totalReceived: acc.totalReceived + p.totalReceived,
      totalSold: acc.totalSold + p.totalSold,
      expectedRemaining: acc.expectedRemaining + p.expectedRemaining,
      discrepancy: acc.discrepancy + p.discrepancy,
    }),
    { currentStock: 0, totalReceived: 0, totalSold: 0, expectedRemaining: 0, discrepancy: 0 }
  );

  return (
    <Card padding="none">
      <CardHeader className="px-4 pt-4 pb-0">
        <CardTitle>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Package className="w-4 h-4 text-muted-foreground" />
            Discrepancia de Inventario
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>EAN</TableHead>
              <TableHead className="text-right">Stock Actual</TableHead>
              <TableHead className="text-right">Recibido</TableHead>
              <TableHead className="text-right">Vendido</TableHead>
              <TableHead className="text-right">Esperado</TableHead>
              <TableHead className="text-right">Discrepancia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => {
              const style = getRowStyle(product.discrepancy);
              return (
                <TableRow key={product.productId} className={clsx(style.bg, 'hover:brightness-110')}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DiscrepancyIcon discrepancy={product.discrepancy} />
                      <span className="truncate max-w-[180px]">{product.productName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                  <TableCell className="font-mono text-xs">{product.ean ?? '—'}</TableCell>
                  <TableCell className="text-right">{product.currentStock}</TableCell>
                  <TableCell className="text-right">{product.totalReceived}</TableCell>
                  <TableCell className="text-right">{product.totalSold}</TableCell>
                  <TableCell className="text-right">{product.expectedRemaining}</TableCell>
                  <TableCell className={clsx('text-right font-semibold', style.text)}>
                    {product.discrepancy > 0 ? '+' : ''}{product.discrepancy}
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Summary row */}
            <TableRow className="border-t-2 border-border bg-secondary/50 font-semibold">
              <TableCell colSpan={3}>
                <span className="text-muted-foreground">Total ({data.length} productos)</span>
              </TableCell>
              <TableCell className="text-right">{totals.currentStock}</TableCell>
              <TableCell className="text-right">{totals.totalReceived}</TableCell>
              <TableCell className="text-right">{totals.totalSold}</TableCell>
              <TableCell className="text-right">{totals.expectedRemaining}</TableCell>
              <TableCell className={clsx('text-right', getRowStyle(totals.discrepancy).text)}>
                {totals.discrepancy > 0 ? '+' : ''}{totals.discrepancy}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
