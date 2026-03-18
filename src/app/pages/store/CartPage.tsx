import { Link } from 'react-router';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { CartPanel } from '../../components/store/CartPanel';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { useCartStore } from '../../lib/store';

export default function CartPage() {
  const { items: cartItems, updateQuantity, removeItem } = useCartStore();

  const handleUpdateQuantity = (id: string, quantity: number) => {
    updateQuantity(id, quantity);
  };

  const handleRemove = (id: string) => {
    removeItem(id);
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
            <div className="lg:col-span-2">
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
                  <Link to="/store/checkout">
                    <Button fullWidth size="lg">Ir al Checkout</Button>
                  </Link>
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
