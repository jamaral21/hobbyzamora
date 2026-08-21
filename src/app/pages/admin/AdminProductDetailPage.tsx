import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ShoppingCart, ArrowLeft, AlertCircle, Clock, Loader2, Edit } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Card } from '../../components/design-system/Card';
import { VariantSelector } from '../../components/store/VariantSelector';
import { productsAPI, ordersAPI } from '../../lib/api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { formatChileDate } from '../../lib/chileDate';

export default function AdminProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAdminAuth();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      try {
        const data = await productsAPI.getByIdAdmin(id);
        setProduct(data);
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  const handleCreateOrder = async () => {
    if (!product) return;
    setIsOrdering(true);
    setOrderError(null);
    setOrderSuccess(null);
    try {
      const order = await ordersAPI.create({
        items: [{ productId: product.id, quantity }],
        customerName: 'Admin Order',
        customerEmail: '',
      });
      setOrderSuccess(`Orden #${order.orderNumber} creada`);
      navigate(`/admin/orders/${order.id}`);
    } catch (err: any) {
      setOrderError(err?.message || 'Error al crear la orden');
    } finally {
      setIsOrdering(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl text-foreground mb-4">Producto no encontrado</h1>
          <Link to="/admin/products">
            <Button>Volver a Productos</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const isLowStock = product.stock < 10;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/products" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Productos
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-foreground">{product.name}</span>
        </div>

        {/* Status banner for non-active products */}
        {product.status !== 'ACTIVE' && (
          <div className="mb-6 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300">
              Este producto está en estado <strong>{product.status}</strong> — no es visible para los clientes.
            </span>
            <Link to={`/admin/products`} className="ml-auto">
              <Button size="sm" variant="outline">
                <Edit className="w-3.5 h-3.5 mr-1" />
                Editar
              </Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="aspect-square bg-secondary rounded-xl overflow-hidden mb-4">
              {product.images?.[selectedImage] ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  Sin imagen
                </div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((image: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === idx ? 'border-primary' : 'border-transparent hover:border-border'
                    }`}
                  >
                    <img src={image} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {product.isPresale && (
                  <Badge variant="presale" pixel className="mb-2">Preventa</Badge>
                )}
                <h1 className="text-3xl text-foreground mb-1 font-[family-name:var(--font-body)]">
                  {product.name}
                </h1>
                <p className="text-muted-foreground">{product.category}</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-4xl text-primary font-bold font-[family-name:var(--font-mono)]">
                ${product.price.toLocaleString('es-CL')}
              </span>
            </div>

            {/* Stock */}
            {isLowStock && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-6">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <span className="text-sm text-destructive">
                  Quedan solo {product.stock} en stock
                </span>
              </div>
            )}

            {/* Presale Info */}
            {product.isPresale && (
              <Card glow="primary" className="mb-6">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm text-foreground mb-1">Preventa</h3>
                    {product.presaleMaxQty && (
                      <p className="text-sm text-muted-foreground">Máx. {product.presaleMaxQty} por cliente</p>
                    )}
                    {product.presaleAvailQty != null && (
                      <p className="text-sm text-muted-foreground">{product.presaleAvailQty} disponibles</p>
                    )}
                    {product.presaleEndDate && (
                      <p className="text-sm text-muted-foreground">
                        Hasta {formatChileDate(product.presaleEndDate)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div className="mb-6">
                <VariantSelector
                  variants={product.variants}
                  onSelect={(variantId, option) => console.log('Selected:', variantId, option)}
                />
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="text-sm text-muted-foreground mb-2 block">Cantidad</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border border-border hover:bg-secondary text-foreground transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 text-center rounded-lg border border-border bg-input-background text-foreground"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border border-border hover:bg-secondary text-foreground transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Order error / success */}
            {orderError && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {orderError}
              </div>
            )}
            {orderSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-[#00e676]/10 border border-[#00e676]/20 text-sm text-[#00e676]">
                {orderSuccess}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mb-8">
              <Button
                fullWidth
                size="lg"
                onClick={handleCreateOrder}
                disabled={isOrdering || product.stock === 0}
              >
                {isOrdering ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShoppingCart className="w-5 h-5" />
                )}
                Crear Orden
              </Button>
            </div>

            {/* Description */}
            {product.description && (
              <div className="border-t border-border pt-6">
                <h3 className="text-foreground mb-3">Descripción</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            {/* Details */}
            <div className="border-t border-border pt-6 mt-6">
              <h3 className="text-foreground mb-3">Detalles</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">SKU</dt>
                  <dd className="text-foreground font-[family-name:var(--font-mono)]">{product.sku}</dd>
                </div>
                {product.ean && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">EAN</dt>
                    <dd className="text-foreground font-[family-name:var(--font-mono)]">{product.ean}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Categoría</dt>
                  <dd className="text-foreground">{product.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Stock</dt>
                  <dd className="text-foreground">{product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Estado</dt>
                  <dd>
                    <Badge variant={product.status === 'ACTIVE' ? 'success' : product.status === 'HIDDEN' ? 'info' : 'default'}>
                      {product.status === 'ACTIVE' ? 'Activo' : product.status === 'HIDDEN' ? 'Oculto' : product.status === 'ARCHIVED' ? 'Desactivado' : product.status}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
