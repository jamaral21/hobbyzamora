import { AlertTriangle } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../design-system/Table';
import { Badge } from '../design-system/Badge';
import { formatChileDate } from '../../lib/chileDate';

export interface FlatBatch {
  id: string;
  productName: string;
  productSku: string;
  batchCode: string;
  quantity: number;
  remaining: number;
  unitCost: number;
  receivedAt: string;
}

export interface InventoryTableProps {
  inventory: FlatBatch[];
  lowStockThreshold?: number;
}

export function InventoryTable({ inventory, lowStockThreshold = 10 }: InventoryTableProps) {
  return (
    <Card padding="none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Lote</TableHead>
            <TableHead>Restante</TableHead>
            <TableHead>Costo Unit.</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.map((item) => {
            const isLowStock = item.remaining < lowStockThreshold;
            const totalValue = item.remaining * item.unitCost;

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isLowStock && <AlertTriangle className="w-4 h-4 text-[#ffab00]" />}
                    {item.productName}
                  </div>
                </TableCell>
                <TableCell>{item.productSku}</TableCell>
                <TableCell>{item.batchCode}</TableCell>
                <TableCell>{item.remaining}</TableCell>
                <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                <TableCell>${totalValue.toFixed(2)}</TableCell>
                <TableCell>{formatChileDate(item.receivedAt)}</TableCell>
                <TableCell>
                  {isLowStock ? (
                    <Badge variant="warning">Stock Bajo</Badge>
                  ) : (
                    <Badge variant="success">En Stock</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
