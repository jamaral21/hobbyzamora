import { AlertTriangle } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../design-system/Table';
import { Badge } from '../design-system/Badge';
import { InventoryBatch } from '../../data/mockData';

export interface InventoryTableProps {
  inventory: InventoryBatch[];
  lowStockThreshold?: number;
}

export function InventoryTable({ inventory, lowStockThreshold = 10 }: InventoryTableProps) {
  return (
    <Card padding="none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Unit Cost</TableHead>
            <TableHead>Total Value</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.map((item) => {
            const isLowStock = item.quantity < lowStockThreshold;
            const totalValue = item.quantity * item.unitCost;

            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isLowStock && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                    {item.productName}
                  </div>
                </TableCell>
                <TableCell>{item.batch}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                <TableCell>${totalValue.toFixed(2)}</TableCell>
                <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {isLowStock ? (
                    <Badge variant="warning">Low Stock</Badge>
                  ) : (
                    <Badge variant="success">In Stock</Badge>
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
