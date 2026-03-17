import { Card, CardHeader, CardTitle, CardContent } from '../design-system/Card';
import { Product } from '../../data/mockData';
import { Button } from '../design-system/Button';
import { Plus } from 'lucide-react';

export interface ProductQuickInsertProps {
  products: Product[];
  onInsert: (product: Product) => void;
}

export function ProductQuickInsert({ products, onInsert }: ProductQuickInsertProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Insert Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {products.slice(0, 8).map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                  {product.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ${product.price.toFixed(2)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onInsert(product)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
