import { Link } from 'react-router';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ShoppingCart, Eye } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  category?: string;
  isPresale?: boolean;
  presaleEndDate?: string;
  maxPurchase?: number;
}

export function ProductCard({
  id,
  name,
  price,
  image,
  stock,
  category,
  isPresale = false,
  presaleEndDate,
  maxPurchase,
}: ProductCardProps) {
  const isLowStock = stock > 0 && stock <= 5;
  const isOutOfStock = stock === 0;

  return (
    <div className="group bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/products/${id}`} className="block relative aspect-square overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isPresale && (
          <Badge className="absolute top-3 left-3 bg-purple-600">
            Presale
          </Badge>
        )}
        {isLowStock && !isOutOfStock && (
          <Badge variant="destructive" className="absolute top-3 right-3">
            Low Stock
          </Badge>
        )}
        {isOutOfStock && (
          <Badge variant="secondary" className="absolute top-3 right-3">
            Out of Stock
          </Badge>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary">
            <Eye className="h-4 w-4 mr-2" />
            Quick View
          </Button>
        </div>
      </Link>
      
      <div className="p-4">
        {category && (
          <p className="text-xs text-gray-500 mb-1">{category}</p>
        )}
        <Link to={`/products/${id}`}>
          <h3 className="font-medium mb-2 line-clamp-2 hover:text-purple-600 transition-colors">
            {name}
          </h3>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-purple-600">
              ${price.toFixed(2)}
            </p>
            {isPresale && maxPurchase && (
              <p className="text-xs text-gray-500">Max {maxPurchase} per order</p>
            )}
          </div>
          <Button 
            size="icon" 
            disabled={isOutOfStock}
            className="rounded-full"
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
        
        {stock <= 10 && stock > 0 && (
          <p className="text-xs text-orange-600 mt-2">
            Only {stock} left in stock
          </p>
        )}
      </div>
    </div>
  );
}
