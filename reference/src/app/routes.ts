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

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage';
import ProductsPage from './pages/admin/ProductsPage';
import InventoryPage from './pages/admin/InventoryPage';
import OrdersPage from './pages/admin/OrdersPage';
import InstagramAgentPage from './pages/admin/InstagramAgentPage';

// POS Pages
import POSPage from './pages/pos/POSPage';

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
    path: '/admin/inventory',
    Component: InventoryPage,
  },
  {
    path: '/admin/orders',
    Component: OrdersPage,
  },
  {
    path: '/admin/presales',
    Component: ProductsPage, // Reuse products page with presale filter
  },
  {
    path: '/admin/customers',
    Component: DashboardPage, // Placeholder
  },
  {
    path: '/admin/analytics',
    Component: DashboardPage, // Placeholder
  },
  {
    path: '/admin/instagram',
    Component: InstagramAgentPage,
  },

  // POS Routes
  {
    path: '/pos',
    Component: POSPage,
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