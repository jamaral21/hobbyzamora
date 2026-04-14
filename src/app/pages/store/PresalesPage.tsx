import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal } from '../../components/auth/AuthModal';
import { presaleAPI, productsAPI, PresaleReservation, Product } from '../../lib/api';
import { useCartStore } from '../../lib/store';
import {
  Clock,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ShoppingBag,
  Tag,
  Sparkles,
  Lock,
  X,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function timeLeft(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m restantes`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  PENDING: {
    label: 'Reservado',
    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Icon: Clock,
  },
  NOTIFIED: {
    label: '¡Llegó! Pagar ahora',
    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Icon: AlertCircle,
  },
  PAID: {
    label: 'Pagado',
    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    Icon: CheckCircle,
  },
  EXPIRED: {
    label: 'Expirado',
    color: 'bg-zinc-700/40 text-zinc-500 border-zinc-600/30',
    Icon: XCircle,
  },
};

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmReserveDialog({
  product,
  onConfirm,
  onCancel,
  loading,
}: {
  product: Product;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl p-6">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center mb-4">
            <Tag className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-white font-bold text-lg leading-snug mb-1">
            Confirmar reserva
          </h3>
          <p className="text-zinc-400 text-sm">
            ¿Deseas reservar <span className="text-white font-semibold">{product.name}</span>?
          </p>
        </div>

        {/* Product summary */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4 mb-5 flex items-center gap-3">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-zinc-600" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{product.name}</p>
            <p className="text-amber-400 font-bold">{formatCLP(product.price)}</p>
            {typeof product.presaleAvailQty === 'number' && (
              <p className="text-zinc-500 text-xs">{product.presaleAvailQty} cupos restantes</p>
            )}
          </div>
        </div>

        <p className="text-zinc-500 text-xs mb-5">
          Solo 1 reserva por cuenta. Se te notificará por correo cuando el producto llegue y tendrás 24 horas para pagar.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-zinc-400 text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
}



export default function PresalesPage() {
  const { isAuthenticated } = useAuth();

  return (
    <StoreLayout>
      {isAuthenticated ? (
        <PresalesContent />
      ) : (
        <PublicPresalesView />
      )}
    </StoreLayout>
  );
}

// Vista pública: solo muestra las preventas disponibles sin sección de "Mis reservas"
function PublicPresalesView() {
  const EMPTY_SET = new Set<string>();
  return (
    <div className="min-h-screen bg-[#0a0a0f] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-amber-400 font-mono tracking-widest uppercase">Preventas</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Preventas disponibles</h1>
          <p className="text-zinc-400 mt-2">
            Reserva productos antes de su llegada.{' '}
            <Link to="/auth" className="text-amber-400 hover:underline">Inicia sesión</Link>{' '}para reservar.
          </p>
        </div>
        <AvailablePresales reservedProductIds={EMPTY_SET} onReserved={() => {}} isAuthenticated={false} />
      </div>
    </div>
  );
}

// ─── Available presales section ───────────────────────────────────────────────

function AvailablePresales({
  reservedProductIds,
  onReserved,
  isAuthenticated,
}: {
  reservedProductIds: Set<string>;
  onReserved: (reservation: PresaleReservation) => void;
  isAuthenticated: boolean;
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);  // product awaiting confirm
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadProducts = useCallback(() => {
    productsAPI
      .getAll({ presale: true })
      .then((data) => setProducts(data.products))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleReserveClick = (product: Product) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setErrors((prev) => ({ ...prev, [product.id]: '' }));
    setPendingProduct(product);
  };

  const handleConfirm = async () => {
    if (!pendingProduct) return;
    setReserving(true);
    try {
      const data = await presaleAPI.reserve(pendingProduct.id);
      setPendingProduct(null);
      onReserved(data.reservation);   // update parent list immediately
      loadProducts();                  // refresh available qty
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [pendingProduct.id]: err.message || 'Error al reservar' }));
      setPendingProduct(null);
    } finally {
      setReserving(false);
    }
  };

  const available = products.filter(
    (p) =>
      !reservedProductIds.has(p.id) &&
      (p.presaleAvailQty == null || p.presaleAvailQty > 0)
  );

  if (loading) return null;
  if (available.length === 0) return null;

  return (
    <>
      {/* Auth modal for unauthenticated users */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Inicia sesión para reservar productos en preventa"
      />

      {/* Confirm dialog */}
      {pendingProduct && (
        <ConfirmReserveDialog
          product={pendingProduct}
          onConfirm={handleConfirm}
          onCancel={() => setPendingProduct(null)}
          loading={reserving}
        />
      )}

      <section className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-bold text-white">Preventas disponibles</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {available.map((product) => {
            const img = product.images?.[0];
            const alreadyReserved = reservedProductIds.has(product.id);
            const soldOut =
              product.presaleAvailQty !== undefined &&
              product.presaleAvailQty !== null &&
              product.presaleAvailQty <= 0;

            return (
              <div
                key={product.id}
                className="relative rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm overflow-hidden group hover:border-amber-500/30 transition-all duration-300"
              >
                {/* Image — clickable to PDP */}
                <Link to={`/store/product/${product.id}`} className="block">
                  <div className="aspect-[4/3] bg-zinc-800 overflow-hidden">
                    {img ? (
                      <img
                        src={img}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-zinc-600" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Content */}
                <div className="p-5">
                  <p className="text-xs text-zinc-500 font-mono mb-1">{product.sku}</p>
                  <Link to={`/store/product/${product.id}`}>
                    <h3 className="font-bold text-white text-sm leading-snug mb-2 hover:text-amber-400 transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  {/* Price + qty */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-amber-400 font-bold text-lg">{formatCLP(product.price)}</span>
                    {typeof product.presaleAvailQty === 'number' && (
                      <span className="text-xs text-zinc-500">
                        {product.presaleAvailQty} cupos restantes
                      </span>
                    )}
                  </div>

                  {errors[product.id] && (
                    <p className="text-red-400 text-xs mb-3">{errors[product.id]}</p>
                  )}

                  {alreadyReserved ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      Reservado
                    </div>
                  ) : soldOut ? (
                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                      <XCircle className="w-4 h-4" />
                      Sin cupos
                    </div>
                  ) : (
                    <button
                      onClick={() => handleReserveClick(product)}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Tag className="w-4 h-4" />
                      Reservar (1 por cuenta)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ─── My reservations ──────────────────────────────────────────────────────────

function PresalesContent() {
  const [reservations, setReservations] = useState<PresaleReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const { addItem, items: cartItems } = useCartStore();

  const load = useCallback(() => {
    presaleAPI
      .getMyReservations()
      .then((data) => setReservations(data.reservations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Called by AvailablePresales after a successful reserve — add to list immediately
  const handleReserved = useCallback((newReservation: PresaleReservation) => {
    setReservations((prev) => [newReservation, ...prev]);
  }, []);

  const handleCancel = async (productId: string) => {
    setCancelling(productId);
    try {
      await presaleAPI.cancelReservation(productId);
      setReservations((prev) => prev.filter((r) => r.productId !== productId));
    } catch { /* noop */ } finally {
      setCancelling(null);
    }
  };

  const reservedProductIds = new Set(reservations.map((r) => r.productId));

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-amber-400 font-mono tracking-widest uppercase">Exclusivo para miembros</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Mis Preventas</h1>
          <p className="text-zinc-400 mt-2">
            Reserva productos antes de su llegada al precio de preventa. Solo 1 reserva por producto por cuenta.
          </p>
        </div>

        {/* Stats bar */}
        {reservations.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { label: 'Reservados', value: reservations.filter((r) => r.status === 'PENDING').length, color: 'text-blue-400' },
              { label: 'Por pagar', value: reservations.filter((r) => r.status === 'NOTIFIED').length, color: 'text-amber-400' },
              { label: 'Pagados', value: reservations.filter((r) => r.status === 'PAID').length, color: 'text-emerald-400' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/3 p-4 text-center">
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* My reservations list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-20 border border-white/8 rounded-2xl bg-white/3">
            <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 font-medium">Aún no tienes preventas reservadas.</p>
            <p className="text-zinc-600 text-sm mt-1">Revisa las preventas disponibles abajo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
              const img = r.product.images?.[0];
              const isNotified = r.status === 'NOTIFIED';
              const isPending = r.status === 'PENDING';

              return (
                <div
                  key={r.id}
                  className={`relative rounded-2xl border bg-white/3 backdrop-blur-sm overflow-hidden transition-all ${
                    isNotified
                      ? 'border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.08)]'
                      : 'border-white/8'
                  }`}
                >
                  <div className="flex gap-4 p-5">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                      {img ? (
                        <img src={img} alt={r.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-zinc-600" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Link
                          to={`/store/product/${r.productId}`}
                          className="font-bold text-white text-sm hover:text-amber-400 transition-colors leading-snug"
                        >
                          {r.product.name}
                        </Link>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} flex-shrink-0`}>
                          <cfg.Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>

                      <p className="text-amber-400 font-bold text-base mb-2">
                        {formatCLP(r.product.price)}
                      </p>

                      {/* Time left for notified */}
                      {isNotified && r.expiresAt && (
                        <p className="text-amber-400/80 text-xs font-mono mb-3">
                          ⏱ {timeLeft(r.expiresAt)}
                        </p>
                      )}

                      <p className="text-zinc-600 text-xs">
                        Reservado el {new Date(r.createdAt).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {(isNotified || isPending) && (
                    <div className="border-t border-white/8 px-5 py-3 flex items-center justify-between gap-3">
                      {isNotified ? (
                        <button
                          onClick={() => {
                            const alreadyInCart = cartItems.some(i => i.productId === r.productId);
                            if (!alreadyInCart) addItem(r.product as any, 1);
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors"
                        >
                          {cartItems.some(i => i.productId === r.productId) ? (
                            <><CheckCircle className="w-4 h-4" /> En el carrito</>
                          ) : (
                            <><ShoppingBag className="w-4 h-4" /> Agregar al carrito</>
                          )}
                        </button>
                      ) : (
                        <p className="text-xs text-zinc-600 italic">Esperando confirmación de llegada...</p>
                      )}

                      {isPending && (
                        <button
                          onClick={() => handleCancel(r.productId)}
                          disabled={cancelling === r.productId}
                          className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                        >
                          {cancelling === r.productId ? 'Cancelando...' : 'Cancelar reserva'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Available presales below */}
        <AvailablePresales reservedProductIds={reservedProductIds} onReserved={handleReserved} isAuthenticated={true} />
      </div>
    </div>
  );
}
