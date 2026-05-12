import { useState, useMemo, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Lock,
  Star,
  Clock,
  Loader2,
  Package,
  CreditCard,
  CheckCircle,
  ShieldAlert,
  XCircle,
  AlertCircle,
  ShoppingBag,
  Tag,
  Sparkles,
  X,
} from 'lucide-react';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { AuthModal } from '../../components/auth/AuthModal';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { presaleAPI, productsAPI, type PresaleReservation, type Product } from '../../lib/api';
import { useCartStore } from '../../lib/store';
import { useAuth } from '../../contexts/AuthContext';
import { useStoreSections } from '../../hooks/useData';
import { buildSectionGroups, matchesCategoryFilter, orderSectionLabels, slugifySection } from '../../lib/sections';

type PresaleTab = 'reservas' | 'disponibles';

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

function timeLeft(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m restantes`;
}

function presaleEndLabel(presaleEndDate?: string | null): string {
  if (!presaleEndDate) return '';
  const diff = new Date(presaleEndDate).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.max(1, Math.floor((diff % 3600000) / 60000));
  if (days > 0) return `Expira en ${days}d ${hours}h`;
  if (hours > 0) return `Expira en ${hours}h ${minutes}m`;
  return `Expira en ${minutes}m`;
}

function PresaleKPICard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex-1 p-5 bg-card border border-border rounded-xl text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
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
  CANCELLED: {
    label: 'Cancelado por admin',
    color: 'bg-red-500/15 text-red-300 border-red-500/30',
    Icon: XCircle,
  },
};

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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
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
          <h3 className="text-white font-bold text-lg mb-1">Confirmar reserva</h3>
          <p className="text-zinc-400 text-sm">
            ¿Deseas reservar <span className="text-white font-semibold">{product.name}</span>?
          </p>
        </div>

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
          </div>
        </div>

        <p className="text-zinc-500 text-xs mb-5">
          Se te notificará por correo cuando el producto llegue y tendrás un plazo limitado para completar el pago.
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

function AvailablePresales({
  reservedProductIds,
  onReserved,
  isAuthenticated,
  isBanned,
  categoryFilter,
  onCategoryOptionsChange,
}: {
  reservedProductIds: Set<string>;
  onReserved: (reservation: PresaleReservation) => void;
  isAuthenticated: boolean;
  isBanned?: boolean;
  categoryFilter: string;
  onCategoryOptionsChange: Dispatch<SetStateAction<string[]>>;
}) {
  const navigate = useNavigate();
  const { data: sectionData } = useStoreSections();
  const groups = useMemo(() => buildSectionGroups(sectionData || []), [sectionData]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadProducts = useCallback(() => {
    setLoading(true);
    productsAPI
      .getAll({ presale: true }, isAuthenticated ? 'customer' : 'public')
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleReserveClick = (product: Product) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (isBanned) {
      setErrors((prev) => ({
        ...prev,
        [product.id]: 'Tu cuenta está bloqueada para futuras preventas. Contacta al administrador.',
      }));
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
      onReserved(data.reservation);
      loadProducts();
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        [pendingProduct.id]: err.message || 'Error al reservar',
      }));
      setPendingProduct(null);
    } finally {
      setReserving(false);
    }
  };

  const available = products.filter(
    (product) =>
      !reservedProductIds.has(product.id) &&
      (product.presaleAvailQty == null || product.presaleAvailQty > 0) &&
      (!product.presaleEndDate || new Date(product.presaleEndDate) > new Date())
  );

  const categoryOptions = useMemo(() => {
    const categories = new Set<string>();
    available.forEach((product) => {
      const category = String(product.category || '').trim();
      if (!category) return;

      const parent = groups.find((group) =>
        group.parentCategory === category || group.children.some((child) => child.name === category)
      );

      categories.add(parent?.parentCategory || category);
    });
    return ['ALL', ...orderSectionLabels(categories)];
  }, [available, groups]);

  const filteredAvailable = useMemo(() => {
    if (categoryFilter === 'ALL') return available;
    return available.filter((product) => matchesCategoryFilter(product.category, slugifySection(categoryFilter), groups));
  }, [available, categoryFilter, groups]);

  useEffect(() => {
    onCategoryOptionsChange((prev) => {
      if (prev.length === categoryOptions.length && prev.every((value, index) => value === categoryOptions[index])) {
        return prev;
      }
      return categoryOptions;
    });
  }, [categoryOptions, onCategoryOptionsChange]);

  return (
    <>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        message="Inicia sesión para reservar productos en preventa"
      />

      {pendingProduct && (
        <ConfirmReserveDialog
          product={pendingProduct}
          onConfirm={handleConfirm}
          onCancel={() => setPendingProduct(null)}
          loading={reserving}
        />
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h2 className="text-lg font-semibold text-foreground">Preventas disponibles</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredAvailable.length === 0 ? (
          <Card className="text-center py-12">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg text-foreground mb-2">Sin preventas para esta categoría</h3>
            <p className="text-sm text-muted-foreground">Prueba con otra categoría o vuelve a "Todas las categorías".</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAvailable.map((product) => {
              const img = product.images?.[0];
              const endLabel = presaleEndLabel(product.presaleEndDate ?? null);

              return (
                <Card
                  key={product.id}
                  className="overflow-hidden p-0 cursor-pointer"
                  onClick={() => navigate(`/store/product/${product.id}`)}
                >
                  <Link to={`/store/product/${product.id}`} className="block">
                    <div className="aspect-[4/3] bg-secondary overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground font-mono mb-1">{product.sku}</p>
                      <Link to={`/store/product/${product.id}`}>
                        <h3 className="text-sm font-medium text-foreground leading-snug hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg font-bold text-primary">{formatCLP(product.price)}</span>
                    </div>

                    {endLabel && (
                      <p className={`text-xs font-semibold ${endLabel === 'Expirado' ? 'text-red-500' : 'text-amber-500'}`}>
                        {endLabel}
                      </p>
                    )}

                    {errors[product.id] && <p className="text-xs text-red-500">{errors[product.id]}</p>}

                    <Button
                      fullWidth
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleReserveClick(product);
                      }}
                    >
                      <Tag className="w-4 h-4" />
                      Reservar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function PresalesContent() {
  const [activeTab, setActiveTab] = useState<PresaleTab>('disponibles');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['ALL']);
  const [reservations, setReservations] = useState<PresaleReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem, items: cartItems } = useCartStore();
  const { user } = useAuth();

  useEffect(() => {
    if (!categoryOptions.includes(categoryFilter)) {
      setCategoryFilter('ALL');
    }
  }, [categoryOptions, categoryFilter]);

  const loadReservations = useCallback(() => {
    if (!user?.id) {
      setReservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    presaleAPI
      .getMyReservations()
      .then((data) => setReservations(data.reservations))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const handleReserved = useCallback((newReservation: PresaleReservation) => {
    setReservations((prev) => [newReservation, ...prev]);
    setActiveTab('reservas');
  }, []);

  const reservedProductIds = new Set(
    reservations
      .filter((reservation) => ['PENDING', 'NOTIFIED', 'PAID'].includes(reservation.status))
      .map((reservation) => reservation.productId)
  );

  const kpis = useMemo(() => {
    const reserved = reservations.filter((reservation) => reservation.status === 'PENDING').length;
    const pending = reservations.filter((reservation) => reservation.status === 'NOTIFIED').length;
    const paid = reservations.filter((reservation) => reservation.status === 'PAID').length;
    return { reserved, pending, paid };
  }, [reservations]);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <PresaleKPICard value={kpis.reserved} label="Reservados" color="text-primary" />
        <PresaleKPICard value={kpis.pending} label="Por pagar" color="text-amber-400" />
        <PresaleKPICard value={kpis.paid} label="Pagados" color="text-[#00e676]" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('reservas')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'reservas'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Star className="w-4 h-4" />
            Mis Reservas
          </button>
          <button
            onClick={() => setActiveTab('disponibles')}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === 'disponibles'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-4 h-4" />
            Disponibles
          </button>
        </div>

        {activeTab === 'disponibles' && (
          <div className="w-full lg:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full lg:w-auto min-w-[240px] rounded-lg border border-primary/60 bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="ALL">Categoria: Todas</option>
              {categoryOptions
                .filter((category) => category !== 'ALL')
                .map((category) => (
                  <option key={category} value={category}>
                    Categoria: {category}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {activeTab === 'reservas' ? (
        loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : reservations.length === 0 ? (
          <Card className="text-center py-12">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg text-foreground mb-2">Sin reservas</h3>
            <p className="text-sm text-muted-foreground mb-6">Aún no has reservado productos en preventa</p>
            <Button onClick={() => setActiveTab('disponibles')}>Ver preventas disponibles</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation) => {
              const config = STATUS_CONFIG[reservation.status] ?? STATUS_CONFIG.PENDING;
              const img = reservation.product.images?.[0];
              const isNotified = reservation.status === 'NOTIFIED';
              const isPending = reservation.status === 'PENDING';
              const isCancelled = reservation.status === 'CANCELLED';
              const alreadyInCart = cartItems.some((item) => item.productId === reservation.productId);

              return (
                <Card key={reservation.id} className="overflow-hidden p-0">
                  <div className="flex gap-4 p-4">
                    <div className="w-20 h-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {img ? (
                        <img src={img} alt={reservation.product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Link
                          to={`/store/product/${reservation.productId}`}
                          className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {reservation.product.name}
                        </Link>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                          <config.Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>

                      <p className="text-lg font-bold text-primary">{formatCLP(reservation.product.price)}</p>

                      {isNotified && reservation.expiresAt && (
                        <p className="text-xs text-amber-500 font-semibold mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {timeLeft(reservation.expiresAt)}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Reservado el {new Date(reservation.createdAt).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </div>

                  {(isNotified || isPending || isCancelled) && (
                    <div className="px-4 py-3 border-t border-border bg-secondary/30 flex items-center justify-between gap-3">
                      {isNotified ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!alreadyInCart) addItem(reservation.product as any, 1);
                          }}
                        >
                          {alreadyInCart ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              En el carrito
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              Agregar al carrito
                            </>
                          )}
                        </Button>
                      ) : isPending ? (
                        <p className="text-xs text-muted-foreground italic">Esperando confirmación de llegada...</p>
                      ) : null}

                      {isCancelled && reservation.cancellationReason && (
                        <p className="text-xs text-red-500">Cancelada por administración: {reservation.cancellationReason}</p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <AvailablePresales
          reservedProductIds={reservedProductIds}
          onReserved={handleReserved}
          isAuthenticated={true}
          isBanned={!!user?.presaleBanned}
          categoryFilter={categoryFilter}
          onCategoryOptionsChange={setCategoryOptions}
        />
      )}
    </div>
  );
}

export default function PresalesPage() {
  const { user } = useAuth();

  return (
    <StoreLayout>
      <RequireAuth message="Inicia sesión para ver preventas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-primary/70" />
              <span className="text-xs font-medium uppercase tracking-[0.25em] text-primary/70">
                Exclusivo para miembros
              </span>
            </div>
            <h1 className="text-3xl text-foreground mb-2">Mis Preventas</h1>
            <p className="text-muted-foreground">
              Reserva productos antes de su llegada al precio de preventa. Solo 1 reserva por producto por cuenta.
            </p>
          </div>

          {user?.presaleBanned ? (
            <Card className="text-center py-12">
              <ShieldAlert className="w-12 h-12 text-destructive/50 mx-auto mb-4" />
              <h3 className="text-lg text-foreground mb-2">Acceso a preventas suspendido</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Tu acceso a preventas ha sido suspendido debido a reservas no pagadas. Si crees que es un error, contáctanos por Instagram o email.
              </p>
            </Card>
          ) : (
            <PresalesContent />
          )}
        </div>
      </RequireAuth>
    </StoreLayout>
  );
}
