import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ShoppingCart, Heart, Share2, AlertCircle, Clock, Loader2, Bookmark } from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { Card } from '../../components/design-system/Card';
import { VariantSelector } from '../../components/store/VariantSelector';
import { productsAPI, wishlistAPI, presaleAPI, type PresaleReservation } from '../../lib/api';
import { useCartStore } from '../../lib/store';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../../components/auth/AuthModal';

function getPresaleExpiryLabel(presaleEndDate?: string | null) {
  if (!presaleEndDate) return null;

  const diff = new Date(presaleEndDate).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.max(1, Math.floor((diff % 3600000) / 60000));

  if (days > 0) return `Expira en ${days}d ${hours}h`;
  if (hours > 0) return `Expira en ${hours}h ${minutes}m`;
  return `Expira en ${minutes}m`;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'copied' | 'error'>('idle');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReserveDialog, setShowReserveDialog] = useState(false);
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveError, setReserveError] = useState('');
  const [myReservation, setMyReservation] = useState<PresaleReservation | null>(null);
  const { addItem } = useCartStore();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      try {
        const data = await productsAPI.getById(id);
        setProduct(data);
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  useEffect(() => {
    if (!id || !isAuthenticated || !user?.id) {
      setIsFavorite(false);
      return;
    }
    wishlistAPI.check(id)
      .then(({ isFavorite }) => setIsFavorite(isFavorite))
      .catch(() => setIsFavorite(false));
  }, [id, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!id || !isAuthenticated || !user?.id) {
      setMyReservation(null);
      return;
    }
    presaleAPI.getMyReservations()
      .then(({ reservations }) => {
        const existing = reservations.find(r => r.product.id === id) ?? null;
        setMyReservation(existing);
      })
      .catch(() => setMyReservation(null));
  }, [id, isAuthenticated, user?.id]);

  const handleReserve = async () => {
    if (!id) return;
    setReserveLoading(true);
    setReserveError('');
    try {
      const { reservation } = await presaleAPI.reserve(id);
      setMyReservation(reservation);
      setShowReserveDialog(false);
    } catch (error: any) {
      setReserveError(error?.message ?? 'No se pudo completar la reserva. Intenta de nuevo.');
    } finally {
      setReserveLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (!id || wishlistLoading) return;
    setWishlistLoading(true);
    try {
      if (isFavorite) {
        await wishlistAPI.remove(id);
        setIsFavorite(false);
      } else {
        await wishlistAPI.add(id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Wishlist toggle error:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleShareProduct = async () => {
    if (!id || !product) return;

    const shareUrl = `${window.location.origin}/store/product/${id}`;
    const shareData = {
      title: `${product.name} | HobbyZamora`,
      text: `Mira este producto: ${product.name}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus('shared');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus('copied');
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }

      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus('copied');
      } catch {
        setShareStatus('error');
      }
    }

    window.setTimeout(() => setShareStatus('idle'), 2200);
  };

  if (isLoading) {
    return (
      <StoreLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StoreLayout>
    );
  }

  if (!product) {
    return (
      <StoreLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-2xl text-foreground mb-4">Producto no encontrado</h1>
          <Link to="/store/products">
            <Button>Volver a Productos</Button>
          </Link>
        </div>
      </StoreLayout>
    );
  }

  const isLowStock = !product.isPresale && product.stock < 10;
  const isPresaleClosed = Boolean(
    product?.isPresale && (
      ((product.presaleAvailQty ?? 1) <= 0) ||
      (product.presaleEndDate && new Date(product.presaleEndDate) <= new Date())
    )
  );
  const isPresaleBlocked = Boolean(user?.presaleBanned);
  const presaleExpiryLabel = product?.isPresale ? getPresaleExpiryLabel(product.presaleEndDate ?? null) : null;

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary">Inicio</Link>
          <span>/</span>
          <Link to="/store/products" className="hover:text-primary">Productos</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Images */}
          <div>
            <div className="aspect-square bg-secondary rounded-xl overflow-hidden mb-4">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((image: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === idx
                      ? 'border-primary'
                      : 'border-transparent hover:border-border'
                  }`}
                >
                  <img src={image} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {product.isPresale && (
                  <Badge variant="presale" pixel className="mb-2">Preventa</Badge>
                )}
                <h1 className="text-3xl text-foreground mb-2 font-[family-name:var(--font-body)]">
                  {product.name}
                </h1>
                <p className="text-muted-foreground">{product.category}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleToggleFavorite}
                  disabled={wishlistLoading}
                  title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  className={`p-2 rounded-lg border transition-colors ${
                    isFavorite
                      ? 'border-red-400/50 bg-red-500/10 hover:bg-red-500/20'
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                    } ${wishlistLoading ? 'opacity-50' : ''}`}
                  />
                </button>
                <button
                  onClick={handleShareProduct}
                  title="Compartir producto"
                  className="p-2 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  <Share2 className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {shareStatus !== 'idle' && (
              <p className={`text-xs mb-4 ${shareStatus === 'error' ? 'text-destructive' : 'text-primary'}`}>
                {shareStatus === 'shared' && 'Producto compartido'}
                {shareStatus === 'copied' && 'Enlace copiado al portapapeles'}
                {shareStatus === 'error' && 'No se pudo compartir el producto'}
              </p>
            )}

            <div className="mb-6">
              <span className="text-4xl text-primary font-bold font-[family-name:var(--font-mono)]">
                ${product.price.toLocaleString('es-CL')}
              </span>
            </div>

            {/* Stock Status */}
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
                    <h3 className="text-sm text-foreground mb-1">
                      Información de Preventa
                    </h3>
                    {product.presaleMaxQty != null && (
                      <p className="text-sm text-muted-foreground">
                        Máximo {product.presaleMaxQty} cupos por producto
                      </p>
                    )}
                    {product.presaleAvailQty != null ? (
                      <p className="text-sm text-muted-foreground">
                        {product.presaleAvailQty} cupos disponibles
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Cupos disponibles</p>
                    )}
                    {presaleExpiryLabel && (
                      <p className={`text-sm font-semibold mt-1 ${presaleExpiryLabel === 'Expirado' ? 'text-red-500' : 'text-amber-500'}`}>
                        {presaleExpiryLabel}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-6">
                <VariantSelector
                  variants={product.variants}
                  onSelect={(variantId, option) => console.log('Selected:', variantId, option)}
                />
              </div>
            )}

            {/* Quantity — solo para productos normales */}
            {!product.isPresale && (
              <div className="mb-6">
                <label className="text-sm text-muted-foreground mb-2 block">
                  Cantidad
                </label>
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
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 text-center rounded-lg border border-border bg-input-background text-foreground"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 rounded-lg border border-border hover:bg-secondary text-foreground transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mb-8">
              {product.isPresale ? (
                myReservation && (myReservation.status === 'PENDING' || myReservation.status === 'NOTIFIED') ? (
                  <Button fullWidth size="lg" disabled variant="outline">
                    <Bookmark className="w-5 h-5" />
                    {myReservation.status === 'PENDING' ? 'Ya reservado' : 'Pago pendiente'}
                  </Button>
                ) : isPresaleBlocked ? (
                  <Button fullWidth size="lg" disabled variant="outline">
                    Cuenta bloqueada para preventas
                  </Button>
                ) : isPresaleClosed ? (
                  <Button fullWidth size="lg" disabled>
                    Preventa cerrada
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    size="lg"
                    onClick={isAuthenticated ? () => { setReserveError(''); setShowReserveDialog(true); } : () => setShowAuthModal(true)}
                  >
                    <Bookmark className="w-5 h-5" />
                    Reservar
                  </Button>
                )
              ) : (
                <>
                  <Button fullWidth size="lg" onClick={() => addItem(product, quantity)} disabled={product.stock === 0}>
                    <ShoppingCart className="w-5 h-5" />
                    Agregar al Carrito
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => { addItem(product, quantity); window.location.href = '/store/checkout'; }} disabled={product.stock === 0}>
                    Comprar Ahora
                  </Button>
                </>
              )}
            </div>

            {/* Description */}
            <div className="border-t border-border pt-6">
              <h3 className="text-foreground mb-3">Descripción</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            {/* Details */}
            <div className="border-t border-border pt-6 mt-6">
              <h3 className="text-foreground mb-3">Detalles del Producto</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">SKU</dt>
                  <dd className="text-foreground font-[family-name:var(--font-mono)]">{product.sku}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Categoría</dt>
                  <dd className="text-foreground">{product.category}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Disponibilidad</dt>
                  <dd className="text-foreground">
                    {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message={product?.isPresale ? 'Inicia sesión para reservar este producto' : 'Inicia sesión para guardar favoritos'}
      />

      {/* Dialogo de confirmación de reserva */}
      {showReserveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Confirmar reserva</h2>
            <p className="text-amber-400 font-semibold text-sm mb-1">{product.name}</p>
            <p className="text-zinc-400 text-sm mb-1">
              ${product.price.toLocaleString('es-CL')}
            </p>
            <p className="text-zinc-500 text-xs mb-6 leading-relaxed">
              Al confirmar, reservas este producto. Cuando llegue recibirás un correo con un plazo límite para completar el pago.
            </p>
            {reserveError && (
              <p className="text-red-400 text-xs mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {reserveError}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowReserveDialog(false)}
                disabled={reserveLoading}
              >
                Cancelar
              </Button>
              <Button fullWidth onClick={handleReserve} disabled={reserveLoading}>
                {reserveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirmar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </StoreLayout>
  );
}
