import { useState } from 'react';
import { Link } from 'react-router';
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { useCartStore } from '../../lib/store';

export function StoreNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cartItemCount = useCartStore((s) => s.getItemCount());

  return (
    <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="HobbyZamora" className="h-10 w-auto invert-0 dark:invert-0 brightness-200" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/store" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Tienda
            </Link>
            <Link to="/store/products" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Productos
            </Link>
            <Link to="/store/presales" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Preventas
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar productos..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link to="/store/cart" className="relative p-2 rounded-lg hover:bg-secondary transition-colors group">
              <ShoppingCart className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[0.6rem] font-bold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,214,10,0.3)]">
                  {cartItemCount}
                </span>
              )}
            </Link>

            <Link to="/store/account" className="hidden md:flex p-2 rounded-lg hover:bg-secondary transition-colors group">
              <User className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Link to="/store" className="block py-2 text-muted-foreground hover:text-primary transition-colors">Tienda</Link>
            <Link to="/store/products" className="block py-2 text-muted-foreground hover:text-primary transition-colors">Productos</Link>
            <Link to="/store/presales" className="block py-2 text-muted-foreground hover:text-primary transition-colors">Preventas</Link>
            <Link to="/store/account" className="block py-2 text-muted-foreground hover:text-primary transition-colors">Mi Cuenta</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
