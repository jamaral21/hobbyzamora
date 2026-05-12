import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Search, ShoppingCart, User, Menu, X, Star, ChevronDown } from 'lucide-react';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { useCartStore } from '../../lib/store';
import { useStoreSections } from '../../hooks/useData';
import { buildSectionGroups, slugifySection } from '../../lib/sections';

export function StoreNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cartItemCount = useCartStore((s) => s.getItemCount());
  const location = useLocation();
  const { data: sections } = useStoreSections();

  const groups = useMemo(() => buildSectionGroups(sections || []), [sections]);
  const currentCategory = new URLSearchParams(location.search).get('category') || '';

  return (
    <nav className="sticky top-0 z-[80] isolate overflow-visible bg-background/80 backdrop-blur-xl border-b border-border">
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
            {groups.map((group) => (
              <div key={group.parentCategory}>
                <Link
                to={`/store/products?category=${group.slug}`}
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 text-muted-foreground hover:text-primary transition-colors"
              >
                {group.parentCategory}
              </Link>
              {group.children.length > 0 && (
                <div className="ml-3 border-l border-border pl-3 pb-1">
                  {group.children.map((child) => (
                    <Link
                      key={child.id}
                      to={`/store/products?category=${child.slug}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Bar */}
      <div className="hidden md:block relative overflow-visible border-t border-border bg-background/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-wrap items-center justify-center gap-2 py-3 overflow-visible">
            {groups.map((group) => {
              const isParentActive = slugifySection(group.parentCategory) === slugifySection(currentCategory);
              const activeChild = group.children.find((child) => child.slug === slugifySection(currentCategory));
              const isActive = isParentActive || Boolean(activeChild);

              return (
                <div key={group.parentCategory} className="relative group shrink-0 group-hover:z-50">
                  <Link
                    to={`/store/products?category=${group.slug}`}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[0.9rem] transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-primary bg-primary/10 font-medium'
                        : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    {group.parentCategory}
                    {group.children.length > 0 && <ChevronDown className="w-3.5 h-3.5" />}
                  </Link>

                  {group.children.length > 0 && (
                    <div className="pointer-events-none absolute left-0 top-[calc(100%-1px)] z-[60] min-w-[220px] rounded-lg border border-border bg-card p-1 opacity-0 shadow-lg transition-all group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                      {group.children.map((child) => (
                        <Link
                          key={child.id}
                          to={`/store/products?category=${child.slug}`}
                          className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                            currentCategory === child.slug
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                          }`}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
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
