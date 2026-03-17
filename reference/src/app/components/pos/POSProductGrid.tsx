import { Product } from '../../data/mockData';
import { Badge } from '../design-system/Badge';

export interface POSProductGridProps {
  products: Product[];
  onSelect: (product: Product) => void;
}

export function POSProductGrid({ products, onSelect }: POSProductGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onSelect(product)}
          className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-600 transition-all text-left"
        >
          <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-3 overflow-hidden">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-lg text-gray-900 dark:text-gray-100">
              ${product.price.toFixed(2)}
            </span>
            {product.stock < 10 && (
              <Badge variant="warning" size="sm">
                {product.stock}
              </Badge>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
