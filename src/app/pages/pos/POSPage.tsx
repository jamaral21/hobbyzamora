import { useState, useMemo } from 'react';
import { Search, Barcode, Loader2, UserPlus, X } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { POSCart } from '../../components/pos/POSCart';
import { POSProductGrid } from '../../components/pos/POSProductGrid';
import { PaymentSelector, PaymentMethod } from '../../components/pos/PaymentSelector';
import { Modal } from '../../components/design-system/Modal';
import { useMutation } from '../../hooks/useData';
import { posAPI } from '../../lib/api';
import { mockProducts, mockCustomers, Customer } from '../../data/mockData';

interface Product {
  id: string;
  name: string;
  price: number;
  sku: string;
  images: string[];
  stock: number;
  isPresale?: boolean;
}

export default function POSPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<Array<{ id: string; name: string; price: number; quantity: number }>>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [presaleAttemptProduct, setPresaleAttemptProduct] = useState<Product | null>(null);
  const [customerTab, setCustomerTab] = useState<'search' | 'create'>('search');
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', email: '', phone: '' });

  const { data: products, isLoading } = { data: mockProducts, isLoading: false };
  const createSale = useMutation(posAPI.createSale);

  const filteredProducts = useMemo(() => {
    return (products || []).filter((p: Product) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return mockCustomers;
    const q = customerSearch.toLowerCase();
    return mockCustomers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(customerSearch)
    );
  }, [customerSearch]);

  const handleAddToCart = (product: Product) => {
    // Presale validation: require customer
    if (product.isPresale && !selectedCustomer) {
      setPresaleAttemptProduct(product);
      setIsCustomerModalOpen(true);
      return;
    }

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

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerModalOpen(false);
    setCustomerSearch('');
    setCustomerTab('search');
    setNewCustomerForm({ name: '', email: '', phone: '' });
    // If there was a presale product waiting, add it now
    if (presaleAttemptProduct) {
      const product = presaleAttemptProduct;
      setPresaleAttemptProduct(null);
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
    }
  };

  const handleCreateCustomer = () => {
    if (!newCustomerForm.name.trim()) return;
    const newCustomer: Customer = {
      id: `new-${Date.now()}`,
      name: newCustomerForm.name.trim(),
      email: newCustomerForm.email.trim(),
      phone: newCustomerForm.phone.trim(),
      totalOrders: 0,
      totalSpent: 0,
      joinDate: new Date().toISOString().split('T')[0],
    };
    handleSelectCustomer(newCustomer);
  };

  const handlePayment = async (method: PaymentMethod) => {
    const methodMap: Record<PaymentMethod, 'CASH' | 'CARD' | 'TRANSFER'> = {
      card: 'CARD', cash: 'CASH', digital: 'TRANSFER',
    };
    try {
      await createSale.mutate({
        items: cartItems.map(item => ({ productId: item.id, quantity: item.quantity })),
        paymentMethod: methodMap[method],
        ...(selectedCustomer && {
          customerName: selectedCustomer.name,
          customerEmail: selectedCustomer.email,
          customerPhone: selectedCustomer.phone,
        }),
      });
      setCartItems([]);
      setIsPaymentModalOpen(false);
      alert('Pago exitoso!');
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Error en el pago. Intenta de nuevo.');
    }
  };

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Developer Navigation Badge */}
      <div className="fixed bottom-6 left-6 z-50">
        <Link to="/nav">
          <Button size="sm" className="shadow-lg">
            🗺️ Ver Páginas
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="HobbyZamora" className="w-10 h-10 rounded-lg object-contain" />
            <div>
              <h1 className="text-xl text-foreground">HobbyZamora POS</h1>
              <p className="text-sm text-muted-foreground">Punto de Venta</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/admin'}>
            Volver al Admin
          </Button>
        </div>

        {/* Customer association bar */}
        <div className="mt-3 flex items-center gap-2">
          {selectedCustomer ? (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm">
              <UserPlus className="w-4 h-4" />
              <span>{selectedCustomer.name}</span>
              <button
                onClick={() => { setSelectedCustomer(null); }}
                className="ml-1 hover:text-destructive transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setPresaleAttemptProduct(null); setIsCustomerModalOpen(true); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-dashed border-border hover:border-primary"
            >
              <UserPlus className="w-4 h-4" />
              Asociar Cliente
            </button>
          )}
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar o escanear producto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-lg"
                    autoFocus
                  />
                </div>
                <Button variant="outline" size="lg">
                  <Barcode className="w-5 h-5" />
                  Escanear
                </Button>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <POSProductGrid
                  products={filteredProducts}
                  onSelect={handleAddToCart}
                />
              )}
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
        title="Método de Pago"
        size="md"
      >
        <PaymentSelector
          total={total}
          onSelectPayment={handlePayment}
          onCancel={() => setIsPaymentModalOpen(false)}
        />
      </Modal>

      {/* Customer Selection Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => { setIsCustomerModalOpen(false); setPresaleAttemptProduct(null); setCustomerSearch(''); setCustomerTab('search'); setNewCustomerForm({ name: '', email: '', phone: '' }); }}
        title="Asociar Cliente"
        size="md"
      >
        <div className="space-y-4">
          {presaleAttemptProduct && (
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent px-3 py-2 rounded-lg text-sm">
              <Search className="w-4 h-4 shrink-0" />
              Los productos en preventa requieren un cliente registrado.
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setCustomerTab('search')}
              className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
                customerTab === 'search'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Buscar Cliente
            </button>
            <button
              onClick={() => setCustomerTab('create')}
              className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
                customerTab === 'create'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Nuevo Cliente
            </button>
          </div>

          {customerTab === 'search' ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1 max-h-64 overflow-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No se encontraron clientes</p>
                    <button
                      onClick={() => setCustomerTab('create')}
                      className="text-sm text-primary hover:underline mt-2"
                    >
                      Crear nuevo cliente
                    </button>
                  </div>
                ) : (
                  filteredCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-transparent hover:bg-secondary hover:border-border transition-all text-left"
                    >
                      <div>
                        <p className="text-sm text-foreground">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.email} · {customer.phone}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{customer.totalOrders} pedidos</span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Nombre *</label>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Teléfono</label>
                <input
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
              <Button
                fullWidth
                onClick={handleCreateCustomer}
                disabled={!newCustomerForm.name.trim()}
              >
                Crear y Asociar Cliente
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
