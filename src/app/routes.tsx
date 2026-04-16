import { createBrowserRouter } from 'react-router';

// Navigation
import NavigationPage from './pages/NavigationPage';

// Store Pages
import HomePage from './pages/store/HomePage';
import ProductListingPage from './pages/store/ProductListingPage';
import ProductDetailPage from './pages/store/ProductDetailPage';
import CartPage from './pages/store/CartPage';
import CheckoutPage from './pages/store/CheckoutPage';
import OrderConfirmationPage from './pages/store/OrderConfirmationPage';
import AccountPage from './pages/store/AccountPage';
import PresalesPage from './pages/store/PresalesPage';
import ResetPasswordPage from './pages/store/ResetPasswordPage';

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage';
import ProductsPage from './pages/admin/ProductsPage';
import AdminProductDetailPage from './pages/admin/AdminProductDetailPage';
import OrdersPage from './pages/admin/OrdersPage';
import OrderDetailPage from './pages/admin/OrderDetailPage';
import CustomersPage from './pages/admin/CustomersPage';
import InstagramAgentPage from './pages/admin/InstagramAgentPage';
import { PresalesPage as AdminPresalesPage } from './pages/admin/PresalesPage';

import InstagramHealthPage from './pages/admin/InstagramHealthPage';

// POS Pages
import POSPage from './pages/pos/POSPage';

// Shipments ERP
import { ShipmentsApp } from './components/layout/ShipmentsLayout';
import ShipmentsDashboardPage from './pages/shipments/DashboardPage';
import ComprasPage from './pages/shipments/ComprasPage';
import BodegaJaponPage from './pages/shipments/BodegaJaponPage';
import BoletasPage from './pages/shipments/BoletasPage';
import PagosPage from './pages/shipments/PagosPage';
import GAVJaponPage from './pages/shipments/GAVJaponPage';
import CajasPage from './pages/shipments/CajasPage';
import BodegaTransitoPage from './pages/shipments/BodegaTransitoPage';
import ComprasWebPage from './pages/shipments/ComprasWebPage';
import InternacionPage from './pages/shipments/InternacionPage';
import CosteoPage from './pages/shipments/CosteoPage';
import BodegaChilePage from './pages/shipments/BodegaChilePage';
import ComprasLocalesPage from './pages/shipments/ComprasLocalesPage';
import VentasPage from './pages/shipments/VentasPage';
import GAVChilePage from './pages/shipments/GAVChilePage';
import EstadoResultadosPage from './pages/shipments/EstadoResultadosPage';
import BalancePage from './pages/shipments/BalancePage';
import FlujoCajaPage from './pages/shipments/FlujoCajaPage';
import ConfiguracionPage from './pages/shipments/ConfiguracionPage';

export const router = createBrowserRouter([
  // Navigation Overview
  {
    path: '/nav',
    Component: NavigationPage,
  },
  
  // Store Routes
  {
    path: '/',
    Component: HomePage,
  },
  {
    path: '/store',
    Component: HomePage,
  },
  {
    path: '/store/products',
    Component: ProductListingPage,
  },
  {
    path: '/store/presales',
    Component: PresalesPage,
  },
  {
    path: '/store/product/:id',
    Component: ProductDetailPage,
  },
  {
    path: '/store/cart',
    Component: CartPage,
  },
  {
    path: '/store/checkout',
    Component: CheckoutPage,
  },
  {
    path: '/store/order-confirmation',
    Component: OrderConfirmationPage,
  },
  {
    path: '/store/account',
    Component: AccountPage,
  },
  {
    path: '/reset-password',
    Component: ResetPasswordPage,
  },

  // Admin Routes
  {
    path: '/admin',
    Component: DashboardPage,
  },
  {
    path: '/admin/products',
    Component: ProductsPage,
  },
  {
    path: '/admin/orders',
    Component: OrdersPage,
  },
  {
    path: '/admin/orders/:id',
    Component: OrderDetailPage,
  },
  {
    path: '/admin/presales',
    Component: AdminPresalesPage,
  },
  {
    path: '/admin/presales/new',
    Component: ProductsPage,
  },
  {
    path: '/admin/store/product/:id',
    Component: AdminProductDetailPage,
  },
  {
    path: '/admin/customers',
    Component: CustomersPage,
  },
  {
    path: '/admin/instagram',
    Component: InstagramAgentPage,
  },

  {
    path: '/admin/instagram-chat/health',
    Component: InstagramHealthPage,
  },

  // POS Routes
  {
    path: '/pos',
    Component: POSPage,
  },

  // Shipments ERP Routes
  {
    path: '/shipments',
    Component: ShipmentsApp,
    children: [
      { index: true, Component: ShipmentsDashboardPage },
      { path: 'compras', Component: ComprasPage },
      { path: 'bodega-japon', Component: BodegaJaponPage },
      { path: 'boletas', Component: BoletasPage },
      { path: 'pagos', Component: PagosPage },
      { path: 'gav-japon', Component: GAVJaponPage },
      { path: 'cajas', Component: CajasPage },
      { path: 'bodega-transito', Component: BodegaTransitoPage },
      { path: 'compras-web', Component: ComprasWebPage },
      { path: 'internacion', Component: InternacionPage },
      { path: 'costeo', Component: CosteoPage },
      { path: 'bodega-chile', Component: BodegaChilePage },
      { path: 'compras-chile', Component: ComprasLocalesPage },
      { path: 'ventas', Component: VentasPage },
      { path: 'gav-chile', Component: GAVChilePage },
      { path: 'eerr', Component: EstadoResultadosPage },
      { path: 'balance', Component: BalancePage },
      { path: 'flujo', Component: FlujoCajaPage },
      { path: 'config', Component: ConfiguracionPage },
    ],
  },

  // 404 Fallback
  {
    path: '*',
    Component: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-4xl text-gray-900 dark:text-gray-100 mb-4">404</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Page not found</p>
          <a
            href="/"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    ),
  },
]);