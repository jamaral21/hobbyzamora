import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MoreHorizontal, AlertTriangle } from 'lucide-react';

interface InventoryBatch {
  id: string;
  product: string;
  sku: string;
  batch: string;
  quantity: number;
  unitCost: number;
  date: string;
  lowStockThreshold?: number;
}

interface InventoryTableProps {
  batches: InventoryBatch[];
  onEdit?: (id: string) => void;
}

export function InventoryTable({ batches, onEdit }: InventoryTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Unit Cost</TableHead>
            <TableHead>Total Value</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => {
            const isLowStock = batch.lowStockThreshold && batch.quantity <= batch.lowStockThreshold;
            const totalValue = batch.quantity * batch.unitCost;
            
            return (
              <TableRow key={batch.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isLowStock && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                    {batch.product}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {batch.sku}
                  </code>
                </TableCell>
                <TableCell>{batch.batch}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{batch.quantity}</span>
                    {isLowStock && (
                      <Badge variant="destructive" className="text-xs">
                        Low
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>${batch.unitCost.toFixed(2)}</TableCell>
                <TableCell className="font-medium">
                  ${totalValue.toFixed(2)}
                </TableCell>
                <TableCell className="text-gray-500">
                  {new Date(batch.date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit?.(batch.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
