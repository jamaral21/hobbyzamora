import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { AlertCircle, Trash2 } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { CartPanel } from '../../components/store/CartPanel';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { useCartStore } from '../../lib/store';
import { productsAPI } from '../../lib/api';

interface StockIssue {
  cartItemId: string;
  name: string;
  reason: 'not_found' | 'insufficient';
  available?: number;
}

export default function CartPage() {
  const { items: cartItems, updateQuantity, removeItem } = useCartStore();
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);
  const [stockChecked, setStockChecked] = useState(false);

  useEffect(() => {
    if (cartItems.length === 0) return;
    setStockChecked(false);
    const issues: StockIssue[] = [];
    Promise.all(
      cartItems.map(async (item) => {
        try {
          // Usar getByIdAdmin para no fallar en productos DRAFT/HIDDEN con stock real.
          // Si no hay token de admin se cae al endpoint público como fallback.
          let product;
          try {
            product = await productsAPI.getByIdAdmin(item.productId);
          } catch {
            product = await productsAPI.getById(item.productId);
          }
          // Hidratar isPresale si el item venía de localStorage sin ese campo
          if (item.isPresale === undefined && product.isPresale !== undefined) {
            useCartStore.setState(state => ({
              items: state.items.map(i =>
                i.id === item.id ? { ...i, isPresale: product.isPresale } : i
              ),
            }));
          }
          // Los productos de preventa no tienen stock físico — no validar
          if (product.isPresale) return;
          // Update stock in store if missing
          if (item.stock === undefined) {
            useCartStore.setState(state => ({
              items: state.items.map(i =>
                i.id === item.id ? { ...i, stock: product.stock } : i
              ),
            }));
          }
          if (product.stock < item.quantity) {
            issues.push({
              cartItemId: item.id,
              name: item.name,
              reason: 'insufficient',
              available: product.stock,
            });
          }
        } catch {
          issues.push({ cartItemId: item.id, name: item.name, reason: 'not_found' });
        }
      })
    ).then(() => {
      setStockIssues(issues);
      setStockChecked(true);
    });
  }, []);

  const handleUpdateQuantity = (id: string, quantity: number) => {
    updateQuantity(id, quantity);
  };

  const handleRemove = (id: string) => {
    removeItem(id);
    setStockIssues(prev => prev.filter(i => i.cartItemId !== id));
  };

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-primary mb-8">CARRITO DE COMPRAS</h1>

        {cartItems.length === 0 ? (
          <Card className="text-center py-12">
            <h2 className="text-xl text-foreground mb-2">Tu carrito está vacío</h2>
            <p className="text-muted-foreground mb-6">
              Agrega productos increíbles para comenzar
            </p>
            <Link to="/store/products">
              <Button>Ver Productos</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {/* Alertas de stock */}
              {stockChecked && stockIssues.length > 0 && (
                <div className="space-y-2">
                  {stockIssues.map(issue => (
                    <div key={issue.cartItemId} className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-red-400">
                          <span className="font-medium">{issue.name}</span>
                          {issue.reason === 'not_found'
                            ? ' — ya no está disponible.'
                            : issue.available === 0
                            ? ' — sin stock disponible.'
                            : ` — solo ${issue.available} disponible${issue.available! > 1 ? 's' : ''} (tienes ${cartItems.find(i => i.id === issue.cartItemId)?.quantity}).`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemove(issue.cartItemId)}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <CartPanel
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            </div>
            <div>
              <Card className="sticky top-24">
                <h3 className="text-lg text-foreground mb-4">
                  Seguir Comprando
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Agrega más productos o continúa al checkout
                </p>
                <div className="flex flex-col gap-3">
                  {stockIssues.length > 0 ? (
                    <Button fullWidth size="lg" disabled>
                      Corrige el stock para continuar
                    </Button>
                  ) : (
                    <Link to="/store/checkout">
                      <Button fullWidth size="lg">Ir al Checkout</Button>
                    </Link>
                  )}
                  <Link to="/store/products">
                    <Button fullWidth variant="outline">Seguir Comprando</Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}
