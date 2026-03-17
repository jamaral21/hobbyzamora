import { Link } from 'react-router';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Product } from '../../data/mockData';

export interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const isLowStock = product.stock < 10;

  return (
    <Card padding="none" hover className="group overflow-hidden">
      <Link to={`/store/product/${product.id}`}>
        <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link to={`/store/product/${product.id}`}>
            <h3 className="text-gray-900 dark:text-gray-100 group-hover:text-purple-600 transition-colors">
              {product.name}
            </h3>
          </Link>
          {product.isPresale && (
            <Badge variant="purple" size="sm">Presale</Badge>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{product.category}</p>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl text-gray-900 dark:text-gray-100">
              ${product.price.toFixed(2)}
            </span>
            {isLowStock && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 text-orange-500" />
                <span className="text-xs text-orange-500">Only {product.stock} left</span>
              </div>
            )}
          </div>

          <Button size="sm" onClick={() => console.log('Add to cart', product.id)}>
            <ShoppingCart className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>
    </Card>
  );
}
