import { Link, useLocation } from 'react-router';
import {
  ShoppingCart, FileText, CreditCard, Building, Warehouse,
  Package, Truck, Globe, Shield, Calculator,
  Store, ShoppingBag, DollarSign, Receipt,
  BarChart3, Scale, ArrowUpDown,
  LayoutDashboard, Settings,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { useShipmentsRole } from '../../contexts/ShipmentsRoleContext';
import type { ShipmentsRole } from '../../data/shipmentsDomain';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface SidebarSection {
  label: string;
  items: NavItem[];
  defaultOpen: boolean;
}

const sections: SidebarSection[] = [
  {
    label: 'Principal',
    defaultOpen: true,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/shipments' },
      { id: 'config', label: 'Configuración', icon: Settings, path: '/shipments/config' },
    ],
  },
  {
    label: 'Japón',
    defaultOpen: true,
    items: [
      { id: 'compras', label: 'Compras', icon: ShoppingCart, path: '/shipments/compras' },
      { id: 'boletas', label: 'Boletas', icon: FileText, path: '/shipments/boletas' },
      { id: 'pagos', label: 'Pagos', icon: CreditCard, path: '/shipments/pagos' },
      { id: 'gav-japon', label: 'GAV Japón', icon: Building, path: '/shipments/gav-japon' },
      { id: 'bodega-japon', label: 'Bodega Japón', icon: Warehouse, path: '/shipments/bodega-japon' },
    ],
  },
  {
    label: 'Envíos',
    defaultOpen: true,
    items: [
      { id: 'cajas', label: 'Cajas', icon: Package, path: '/shipments/cajas' },
      { id: 'bodega-transito', label: 'Bodega Tránsito', icon: Truck, path: '/shipments/bodega-transito' },
      { id: 'compras-web', label: 'Compras Web', icon: Globe, path: '/shipments/compras-web' },
      { id: 'internacion', label: 'Internación', icon: Shield, path: '/shipments/internacion' },
      { id: 'costeo', label: 'Costeo', icon: Calculator, path: '/shipments/costeo' },
    ],
  },
  {
    label: 'Chile',
    defaultOpen: true,
    items: [
      { id: 'bodega-chile', label: 'Bodega Chile', icon: Store, path: '/shipments/bodega-chile' },
      { id: 'compras-chile', label: 'Compras Locales', icon: ShoppingBag, path: '/shipments/compras-chile' },
      { id: 'ventas', label: 'Ventas', icon: DollarSign, path: '/shipments/ventas' },
      { id: 'gav-chile', label: 'GAV Chile', icon: Receipt, path: '/shipments/gav-chile' },
    ],
  },
  {
    label: 'Finanzas',
    defaultOpen: true,
    items: [
      { id: 'eerr', label: 'Estado Resultados', icon: BarChart3, path: '/shipments/eerr' },
      { id: 'balance', label: 'Balance', icon: Scale, path: '/shipments/balance' },
      { id: 'flujo', label: 'Flujo de Caja', icon: ArrowUpDown, path: '/shipments/flujo' },
    ],
  },
];

const roleLabels: Record<ShipmentsRole, string> = {
  admin: 'Administrador',
  japon: 'Operador Japón',
  chile: 'Operador Chile',
  contador: 'Contador',
};

export function ShipmentsSidebar() {
  const location = useLocation();
  const { role, setRole, hasAccess } = useShipmentsRole();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(sections.map(s => [s.label, s.defaultOpen])),
  );

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => {
    if (path === '/shipments') return location.pathname === '/shipments';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={clsx(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!isCollapsed && (
          <Link to="/shipments" className="flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            <span className="text-foreground text-sm font-medium">Shipments ERP</span>
          </Link>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Role Selector */}
      {!isCollapsed && (
        <div className="px-3 py-3 border-b border-border">
          <label className="block text-xs text-muted-foreground mb-1">Rol activo</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as ShipmentsRole)}
            className="w-full px-2 py-1.5 rounded-lg text-sm text-foreground bg-input-background border border-border focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            {(Object.keys(roleLabels) as ShipmentsRole[]).map(r => (
              <option key={r} value={r}>{roleLabels[r]}</option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="space-y-2">
          {sections.map(section => {
            const visibleItems = section.items.filter(item => hasAccess(item.id));
            if (visibleItems.length === 0) return null;
            const isOpen = openSections[section.label];

            return (
              <div key={section.label}>
                {!isCollapsed && (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    {section.label}
                    {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
                {(isCollapsed || isOpen) && (
                  <div className="space-y-0.5 mt-1">
                    {visibleItems.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.id}
                          to={item.path}
                          className={clsx(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                            active
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                          )}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          {!isCollapsed && <span className="text-sm">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Store className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Ver Tienda</span>}
        </Link>
      </div>
    </aside>
  );
}
