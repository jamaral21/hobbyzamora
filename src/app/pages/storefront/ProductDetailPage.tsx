import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ShoppingCart, Heart, Share2, Minus, Plus, Clock, Package } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

export function ProductDetailPage() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState('standard');

  // Mock product data
  const product = {
    id,
    name: 'Premium Action Figure Collection',
    price: 89.99,
    originalPrice: 119.99,
    image: 'https://images.unsplash.com/photo-1700909416178-40b292788200?w=800',
    images: [
      'https://images.unsplash.com/photo-1700909416178-40b292788200?w=800',
      'https://images.unsplash.com/photo-1705393928685-4dec061491dd?w=800',
      'https://images.unsplash.com/photo-1579361647854-cf9cda91d4b8?w=800',
    ],
    stock: 8,
    category: 'Action Figures',
    sku: 'AF-2024-001',
    isPresale: false,
    description: 'A premium collection of highly detailed action figures featuring authentic designs and premium materials. Perfect for collectors and enthusiasts alike.',
    features: [
      'High-quality materials',
      'Authentic detailing',
      'Limited edition packaging',
      'Certificate of authenticity',
      'Collector display base',
    ],
    variants: [
      { id: 'standard', name: 'Standard Edition', price: 89.99, stock: 8 },
      { id: 'deluxe', name: 'Deluxe Edition', price: 129.99, stock: 3 },
      { id: 'ultimate', name: 'Ultimate Edition', price: 199.99, stock: 1 },
    ],
  };

  const [selectedImage, setSelectedImage] = useState(product.images[0]);
  const selectedVariantData = product.variants.find(v => v.id === selectedVariant);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-8">
        <Link to="/" className="hover:text-purple-600">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-purple-600">Products</Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
        {/* Image Gallery */}
        <div>
          <div className="mb-4 aspect-square rounded-lg overflow-hidden bg-gray-100">
            <ImageWithFallback
              src={selectedImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(image)}
                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImage === image ? 'border-purple-600' : 'border-transparent'
                }`}
              >
                <ImageWithFallback
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <div className="mb-4">
            <Badge className="mb-2">{product.category}</Badge>
            {product.stock <= 5 && (
              <Badge variant="destructive" className="ml-2">Low Stock</Badge>
            )}
          </div>
          
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-bold text-purple-600">
              ${selectedVariantData?.price.toFixed(2)}
            </span>
            {product.originalPrice > product.price && (
              <span className="text-lg text-gray-400 line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          <p className="text-gray-600 mb-6">{product.description}</p>

          {/* Variants */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Select Edition</h3>
            <div className="grid grid-cols-3 gap-3">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariant(variant.id)}
                  className={`p-3 border-2 rounded-lg text-sm transition-all ${
                    selectedVariant === variant.id
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{variant.name}</div>
                  <div className="text-xs text-gray-500 mt-1">${variant.price}</div>
                  {variant.stock <= 3 && (
                    <div className="text-xs text-orange-600 mt-1">Only {variant.stock} left</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Quantity</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.min(selectedVariantData?.stock || 0, quantity + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm text-gray-500">
                {selectedVariantData?.stock} available
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <Button size="lg" className="flex-1">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </Button>
            <Button size="lg" variant="outline">
              <Heart className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
              <Package className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Free Shipping</p>
                <p className="text-xs text-gray-600">Orders over $50</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Fast Delivery</p>
                <p className="text-xs text-gray-600">2-3 business days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Tabs */}
      <Tabs defaultValue="description" className="mb-12">
        <TabsList>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="mt-6">
          <div className="prose max-w-none">
            <p className="text-gray-600">{product.description}</p>
            <p className="text-gray-600 mt-4">
              This premium collection features authentic designs and high-quality materials, 
              making it perfect for serious collectors and enthusiasts. Each piece is carefully 
              verificado como producto original Pokémon TCG con empaque oficial.
            </p>
          </div>
        </TabsContent>
        <TabsContent value="features" className="mt-6">
          <ul className="space-y-3">
            {product.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-2" />
                <span className="text-gray-600">{feature}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="shipping" className="mt-6">
          <div className="space-y-4 text-gray-600">
            <p>Free standard shipping on all orders over $50.</p>
            <p>Orders are processed within 1-2 business days and typically arrive within 2-3 business days.</p>
            <p>Express shipping options available at checkout.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
