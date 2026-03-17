import { Link } from 'react-router';
import { Button } from '../../components/ui/button';
import { ProductCard } from '../../components/design-system/ProductCard';
import { ArrowRight, Zap, Shield, Truck } from 'lucide-react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';

const featuredProducts = [
  {
    id: '1',
    name: 'Premium Action Figure Collection',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1700909416178-40b292788200?w=400',
    stock: 8,
    category: 'Action Figures',
  },
  {
    id: '2',
    name: 'Limited Edition Model Kit',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1705393928685-4dec061491dd?w=400',
    stock: 3,
    category: 'Model Kits',
    isPresale: true,
    presaleEndDate: '2026-04-01',
    maxPurchase: 2,
  },
  {
    id: '3',
    name: 'Collectible Trading Cards Set',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1579361647854-cf9cda91d4b8?w=400',
    stock: 25,
    category: 'Trading Cards',
  },
  {
    id: '4',
    name: 'Exclusive Vinyl Figure',
    price: 59.99,
    image: 'https://images.unsplash.com/photo-1762215643003-d6fb6fa4c777?w=400',
    stock: 12,
    category: 'Vinyl Figures',
  },
];

export function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              Tu Tienda de Cartas Pokémon
            </h1>
            <p className="text-xl mb-8 text-purple-100">
              Sobres sellados, cartas sueltas, preventas exclusivas y productos Pokémon TCG.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" variant="secondary">
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/products?category=presale">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-purple-600">
                  View Presales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Exclusive Presales</h3>
              <p className="text-gray-600 text-sm">
                Get early access to limited edition items before anyone else.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Authentic Items</h3>
              <p className="text-gray-600 text-sm">
                All products are verified authentic and come with guarantees.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 mb-4">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-2">Fast Shipping</h3>
              <p className="text-gray-600 text-sm">
                Free shipping on orders over $50 with secure packaging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Featured Products</h2>
            <Link to="/products">
              <Button variant="ghost">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </div>
      </section>

      {/* Banner */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Join Our Community
            </h2>
            <p className="text-gray-300 mb-6">
              Follow us on Instagram for exclusive drops, behind-the-scenes content, and special deals.
            </p>
            <Button size="lg" variant="secondary">
              Follow @HobbyZamora
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
