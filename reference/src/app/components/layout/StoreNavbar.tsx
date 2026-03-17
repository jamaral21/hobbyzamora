import { useState } from 'react';
import { Link } from 'react-router';
import { Search, ShoppingCart, User, Menu, X, Moon, Sun } from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';

export function StoreNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const cartItemCount = 3; // Mock cart count

  return (
    <nav className="sticky top-0 z-40 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg" />
            <span className="text-xl text-gray-900 dark:text-gray-100">HobbyZamora</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/store" className="text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors">
              Shop
            </Link>
            <Link to="/store/products" className="text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors">
              Products
            </Link>
            <Link to="/store/presales" className="text-sm text-gray-700 dark:text-gray-300 hover:text-purple-600 transition-colors">
              Presales
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <Link to="/store/cart" className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              {cartItemCount > 0 && (
                <Badge variant="purple" className="absolute -top-1 -right-1 w-5 h-5 text-xs">
                  {cartItemCount}
                </Badge>
              )}
            </Link>

            <button className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            <button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="px-4 py-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <Link to="/store" className="block py-2 text-gray-700 dark:text-gray-300">Shop</Link>
            <Link to="/store/products" className="block py-2 text-gray-700 dark:text-gray-300">Products</Link>
            <Link to="/store/presales" className="block py-2 text-gray-700 dark:text-gray-300">Presales</Link>
            <Link to="/store/account" className="block py-2 text-gray-700 dark:text-gray-300">Account</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
