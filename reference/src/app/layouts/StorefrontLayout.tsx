import { Outlet, Link } from 'react-router';
import { ShoppingCart, Search, User, Menu } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export function StorefrontLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-2xl font-semibold text-purple-600">
                HobbyZamora
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link to="/products" className="text-sm hover:text-purple-600 transition-colors">
                  Products
                </Link>
                <Link to="/products?category=presale" className="text-sm hover:text-purple-600 transition-colors">
                  Presale
                </Link>
                <Link to="/products?category=new" className="text-sm hover:text-purple-600 transition-colors">
                  New Arrivals
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center relative">
                <Search className="absolute left-3 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    3
                  </span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">HobbyZamora</h3>
              <p className="text-sm text-gray-600">
                Your premium hobby and collectibles marketplace.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link to="/products">All Products</Link></li>
                <li><Link to="/products?category=presale">Presale Items</Link></li>
                <li><Link to="/products?category=new">New Arrivals</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#">Contact Us</a></li>
                <li><a href="#">FAQ</a></li>
                <li><a href="#">Shipping Info</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#">About</a></li>
                <li><Link to="/admin">Admin Dashboard</Link></li>
                <li><Link to="/pos">POS System</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-gray-600">
            © 2026 HobbyZamora. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
