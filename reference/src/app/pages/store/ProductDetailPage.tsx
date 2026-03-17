import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { ShoppingCart, Heart, Share2, AlertCircle, Clock } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Card } from '../../components/design-system/Card';
import { VariantSelector } from '../../components/store/VariantSelector';
import { mockProducts } from '../../data/mockData';

export default function ProductDetailPage() {
  const { id } = useParams();
  const product = mockProducts.find((p) => p.id === id);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  if (!product) {
    return (
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-2xl text-gray-900 dark:text-gray-100 mb-4">Product not found</h1>
          <Link to="/store/products">
            <Button>Back to Products</Button>
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const isLowStock = product.stock < 10;

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link to="/" className="hover:text-purple-600">Home</Link>
          <span>/</span>
          <Link to="/store/products" className="hover:text-purple-600">Products</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Images */}
          <div>
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-4">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((image, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    selectedImage === idx
                      ? 'border-purple-600'
                      : 'border-transparent'
                  }`}
                >
                  <img src={image} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {product.isPresale && (
                  <Badge variant="purple" className="mb-2">Presale Item</Badge>
                )}
                <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">
                  {product.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">{product.category}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Heart className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl text-gray-900 dark:text-gray-100">
                ${product.price.toFixed(2)}
              </span>
            </div>

            {/* Stock Status */}
            {isLowStock && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-orange-600">
                  Only {product.stock} left in stock
                </span>
              </div>
            )}

            {/* Presale Info */}
            {product.isPresale && product.presaleData && (
              <Card className="mb-6 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm text-purple-900 dark:text-purple-100 mb-1">
                      Presale Information
                    </h3>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Limited to {product.presaleData.maxQuantity} per customer
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      {product.presaleData.availableQuantity} available
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-6">
                <VariantSelector
                  variants={product.variants}
                  onSelect={(variantId, option) => console.log('Selected:', variantId, option)}
                />
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-8">
              <Button fullWidth size="lg">
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </Button>
              <Button variant="outline" size="lg">
                Buy Now
              </Button>
            </div>

            {/* Description */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-gray-900 dark:text-gray-100 mb-3">Description</h3>
              <p className="text-gray-600 dark:text-gray-400">{product.description}</p>
            </div>

            {/* Details */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
              <h3 className="text-gray-900 dark:text-gray-100 mb-3">Product Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">SKU</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{product.sku}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Category</dt>
                  <dd className="text-gray-900 dark:text-gray-100">{product.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Availability</dt>
                  <dd className="text-gray-900 dark:text-gray-100">
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
