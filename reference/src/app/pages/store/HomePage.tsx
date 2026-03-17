import { Link } from 'react-router';
import { ArrowRight, Sparkles, Clock, Shield } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { ProductCard } from '../../components/store/ProductCard';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { mockProducts } from '../../data/mockData';

export default function HomePage() {
  const featuredProducts = mockProducts.slice(0, 4);
  const presaleProducts = mockProducts.filter((p) => p.isPresale);

  return (
    <StoreLayout>
      {/* Developer Navigation Badge */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link to="/nav">
          <Button size="sm" className="shadow-lg">
            🗺️ View All Pages
          </Button>
        </Link>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl mb-6">
              Discover Your Creative Passion
            </h1>
            <p className="text-xl mb-8 text-purple-100">
              Premium art supplies, craft materials, and hobby essentials for creators of all levels
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/store/products">
                <Button size="lg" variant="secondary">
                  Shop Now
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link to="/store/presales">
                <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  View Presales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center">
            <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-gray-900 dark:text-gray-100 mb-2">Premium Quality</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Curated selection of professional-grade materials
            </p>
          </Card>
          <Card className="text-center">
            <Clock className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-gray-900 dark:text-gray-100 mb-2">Fast Shipping</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Quick delivery to fuel your creativity
            </p>
          </Card>
          <Card className="text-center">
            <Shield className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-gray-900 dark:text-gray-100 mb-2">Secure Checkout</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Safe and secure payment processing
            </p>
          </Card>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">Featured Products</h2>
            <p className="text-gray-500 dark:text-gray-400">Popular items loved by our community</p>
          </div>
          <Link to="/store/products">
            <Button variant="outline">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Presales */}
      {presaleProducts.length > 0 && (
        <section className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">Presale Items</h2>
              <p className="text-gray-500 dark:text-gray-400">
                Get exclusive access to upcoming products
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {presaleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-center">
          <h2 className="text-3xl mb-4">Join Our Creative Community</h2>
          <p className="text-lg text-purple-100 mb-6 max-w-2xl mx-auto">
            Get exclusive deals, early access to new products, and creative inspiration
          </p>
          <Button size="lg" variant="secondary">
            Sign Up Now
          </Button>
        </Card>
      </section>
    </StoreLayout>
  );
}