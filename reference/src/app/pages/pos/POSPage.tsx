import { useState } from 'react';
import { Search, Barcode, Grid, List, X } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { POSCart } from '../../components/pos/POSCart';
import { POSProductGrid } from '../../components/pos/POSProductGrid';
import { PaymentSelector, PaymentMethod } from '../../components/pos/PaymentSelector';
import { Modal } from '../../components/design-system/Modal';
import { mockProducts, Product } from '../../data/mockData';

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cartItems, setCartItems] = useState<Array<{ id: string; name: string; price: number; quantity: number }>>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const filteredProducts = mockProducts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = (product: Product) => {
    const existingItem = cartItems.find((item) => item.id === product.id);
    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        { id: product.id, name: product.name, price: product.price, quantity: 1 },
      ]);
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCartItems(
      cartItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const handleRemove = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    setIsPaymentModalOpen(true);
  };

  const handlePayment = (method: PaymentMethod) => {
    console.log('Payment method:', method);
    // Process payment
    setCartItems([]);
    setIsPaymentModalOpen(false);
    alert('Payment successful!');
  };

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Developer Navigation Badge */}
      <div className="fixed bottom-6 left-6 z-50">
        <Link to="/nav">
          <Button size="sm" className="shadow-lg">
            🗺️ View All Pages
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg" />
            <div>
              <h1 className="text-xl text-gray-900 dark:text-gray-100">HobbyZamora POS</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Point of Sale</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/admin'}>
            Back to Admin
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Products Section */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Search & Controls */}
            <Card>
              <CardContent className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search or scan product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                    autoFocus
                  />
                </div>
                <Button variant="outline" size="lg">
                  <Barcode className="w-5 h-5" />
                  Scan
                </Button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 rounded-lg transition-colors ${
                      viewMode === 'list'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="flex-1 overflow-auto">
              <POSProductGrid
                products={filteredProducts}
                onSelect={handleAddToCart}
              />
            </div>
          </div>

          {/* Cart Section */}
          <div>
            <POSCart
              items={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemove}
              onCheckout={handleCheckout}
              onClear={() => setCartItems([])}
            />
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Select Payment Method"
        size="md"
      >
        <PaymentSelector
          total={total}
          onSelectPayment={handlePayment}
          onCancel={() => setIsPaymentModalOpen(false)}
        />
      </Modal>
    </div>
  );
}