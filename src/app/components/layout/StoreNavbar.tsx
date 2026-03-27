import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Search, ShoppingCart, User, Menu, X, Star } from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { useCartStore } from '../../lib/store';

const STORE_CATEGORIES = [
  { name: 'Pokémon TCG', href: '/store/products?category=pokemon-tcg' },
  { name: 'Beyblade X', href: '/store/products?category=beyblade-x' },
  { name: 'Pokémon Merch', href: '/store/products?category=pokemon-merch' },
  { name: 'Autos Tomy Tomica', href: '/store/products?category=tomica' },
  { name: 'Figuarts', href: '/store/products?category=figuarts' },
  { name: 'Nintendo', href: '/store/products?category=nintendo' },
  { name: 'Coleccionables Varios', href: '/store/products?category=coleccionables' },
] as const;

export function StoreNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cartItemCount = useCartStore((s) => s.getItemCount());
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 relative">
          {/* Left — Search */}
          <div className="hidden md:flex flex-1 justify-start">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar productos..."
                className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              />
            </div>
          </div>

          {/* Mobile — Hamburger (left side) */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Center — Logo */}
          <Link to="/" className="flex items-center gap-2.5 group absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:flex-none">
            <img src="/logo.png" alt="HobbyZamora" className="h-16 w-auto invert-0 dark:invert-0 brightness-200" />
          </Link>

          {/* Right — Cart + Login */}
          <div className="flex items-center gap-4 flex-1 justify-end">
            <Link to="/store/cart" className="relative p-2.5 rounded-lg hover:bg-secondary transition-colors group">
              <ShoppingCart className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5.5 h-5.5 bg-primary text-primary-foreground text-[0.65rem] font-bold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,214,10,0.3)]">
                  {cartItemCount}
                </span>
              )}
            </Link>

            <Link to="/store/account" className="hidden md:flex p-2.5 rounded-lg hover:bg-secondary transition-colors group">
              <User className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
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
            <Link to="/store/presales" className="flex items-center gap-2 py-2 text-amber-500 hover:text-amber-400 font-medium transition-colors">
              <Star className="w-4 h-4 fill-amber-500" />
              Preventas
            </Link>
            <Link to="/store/account" className="block py-2 text-muted-foreground hover:text-primary transition-colors">Mi Cuenta</Link>

            {/* Separator */}
            <div className="border-t border-border my-2" />

            {/* Categories */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1">Categorías</p>
            {STORE_CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                to={cat.href}
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 text-muted-foreground hover:text-primary transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category Bar */}
      <div className="hidden md:block border-t border-border bg-background/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-3" style={{ scrollbarWidth: 'none' }}>
            {STORE_CATEGORIES.map((cat) => {
              const isActive = location.pathname + location.search === cat.href;
              return (
                <Link
                  key={cat.name}
                  to={cat.href}
                  className={`shrink-0 px-4 py-2 rounded-md text-[0.9rem] transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-primary bg-primary/10 font-medium'
                      : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
            <Link
              to="/store/presales"
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-md text-[0.9rem] transition-colors whitespace-nowrap font-medium ${
                location.pathname === '/store/presales'
                  ? 'text-amber-500 bg-amber-500/15'
                  : 'text-amber-500 hover:bg-amber-500/10'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-500" />
              Preventas
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
