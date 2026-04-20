import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  Plus,
  Search,
  RefreshCw,
  PackageCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  Bell,
  Trash2,
  Edit,
  Ban,
} from 'lucide-react';
import { presaleAPI, productsAPI, AdminPresaleReservation, Product } from '../../lib/api';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Modal } from '../../components/design-system/Modal';
import { ProductEditor } from '../../components/admin/ProductEditor';
import { productsAPI as productsAPIFull } from '../../lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

function getPresaleEndLabel(presaleEndDate?: string | null) {
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

const STATUS_CONFIG: Record<string, { label: string; color: string; Icon: any }> = {
  PENDING: { label: 'Pendiente', color: 'bg-blue-100 text-blue-700', Icon: Clock },
  NOTIFIED: { label: 'Notificado', color: 'bg-amber-100 text-amber-700', Icon: AlertCircle },
  PAID: { label: 'Pagado', color: 'bg-green-100 text-green-700', Icon: CheckCircle },
  EXPIRED: { label: 'Expirado', color: 'bg-zinc-100 text-zinc-500', Icon: XCircle },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700', Icon: XCircle },
};

// ─── Presale products summary ─────────────────────────────────────────────────

function PresaleProductCard({
  product,
  activeReservedCount,
  onConfirmArrival,
  onRelease,
  onEdit,
  onConvert,
  releasingId,
  loadingId,
}: {
  product: Product;
  activeReservedCount: number;
  onConfirmArrival: (productId: string) => void;
  onRelease: (product: Product) => void;
  onEdit: (product: Product) => void;
  onConvert: (product: Product) => void;
  releasingId: string | null;
  loadingId: string | null;
}) {
  const img = product.images?.[0];
  const total = Math.max(0, product.presaleAvailQty ?? 0);
  const reserved = Math.max(0, activeReservedCount);
  const pct = total > 0 ? Math.min((reserved / total) * 100, 100) : 0;
  const presaleEndLabel = getPresaleEndLabel(product.presaleEndDate ?? null);
  const isArrivalConfirmed = Boolean(product.presaleArrivedAt);
  const isExpiredByDate = Boolean(product.presaleEndDate && new Date(product.presaleEndDate) <= new Date());
  const isSoldOut = total > 0 && reserved >= total;
  const readyToConvert = Boolean(product.isPresale && (isExpiredByDate || isSoldOut || product.status === 'HIDDEN'));

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex gap-4 items-start">
      <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
        <ImageWithFallback
          src={img || ''}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-snug">{product.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-primary font-bold text-sm">{formatCLP(product.price)}</span>
          <span className="text-xs text-muted-foreground">
            {reserved}/{total} reservados
          </span>
        </div>
        {presaleEndLabel && (
          <p className={`text-xs mt-1 font-semibold ${presaleEndLabel === 'Expirado' ? 'text-red-500' : 'text-amber-600'}`}>
            {presaleEndLabel}
          </p>
        )}
        {/* progress bar */}
        <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {total <= 0 && (
          <p className="text-xs text-red-500 mt-1 font-medium">Sin cupos disponibles</p>
        )}
        {readyToConvert && (
          <p className="text-xs text-emerald-600 mt-1 font-medium">Lista para verificar y convertir a producto</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onRelease(product)}
          disabled={releasingId === product.id}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 text-emerald-700 text-xs font-semibold hover:bg-emerald-50 disabled:opacity-60 transition-colors"
          title="Liberar preventa para venta inmediata"
        >
          {releasingId === product.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <PackageCheck className="w-3.5 h-3.5" />
          )}
          Liberar
        </button>
        <button
          onClick={() => onEdit(product)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-secondary transition-colors"
          title="Editar preventa"
        >
          <Edit className="w-3.5 h-3.5" />
          Editar
        </button>
        {readyToConvert && (
          <button
            onClick={() => onConvert(product)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors"
            title="Verificar datos y convertir a producto"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Convertir
          </button>
        )}
        <button
          onClick={() => onConfirmArrival(product.id)}
          disabled={loadingId === product.id || isArrivalConfirmed}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-60 transition-colors"
          title={isArrivalConfirmed ? 'La llegada ya fue confirmada' : 'Notificar a todos los reservadores pendientes'}
        >
          {loadingId === product.id ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <PackageCheck className="w-3.5 h-3.5" />
          )}
          {isArrivalConfirmed ? 'Confirmado' : 'Llegó'}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PresalesPage() {
  const [reservations, setReservations] = useState<AdminPresaleReservation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [releasingExpired, setReleasingExpired] = useState(false);
  const [releasingProductId, setReleasingProductId] = useState<string | null>(null);
  const [releaseProduct, setReleaseProduct] = useState<Product | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [restoringUserId, setRestoringUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1 });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editorMode, setEditorMode] = useState<'edit' | 'convert'>('edit');
  const [savingProduct, setSavingProduct] = useState(false);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadReservations = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const data = await presaleAPI.adminList({
        status: statusFilter || undefined,
        page,
        limit: 30,
      });
      setReservations(data.reservations);
      setPagination(data.pagination);
    } catch {
      showToast('Error al cargar reservas', 'err');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadProducts = async () => {
    try {
      const data = await productsAPI.getAll({ presale: true, status: 'ALL', limit: 100 }, 'admin');
      setProducts(data.products);
    } catch { /* noop */ }
  };

  useEffect(() => { loadReservations(); loadProducts(); }, [loadReservations]);

  const handleConfirmArrival = async (productId: string) => {
    setConfirmingId(productId);
    try {
      const data = await presaleAPI.confirmArrival(productId);
      showToast(data.message);
      await Promise.all([loadReservations(), loadProducts()]);
    } catch (err: any) {
      showToast(err.message || 'Error al confirmar llegada', 'err');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleEditProduct = async (data: any) => {
    if (!editingProduct) return;
    setSavingProduct(true);
    try {
      const apiData = { ...data };

      if (editorMode === 'convert') {
        apiData.isPresale = false;
        apiData.status = 'ACTIVE';
        apiData.presaleMaxQty = null;
        apiData.presaleAvailQty = null;
        apiData.presaleEndDate = null;
        const updated = await productsAPIFull.update(editingProduct.id, apiData);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast('Preventa verificada y convertida a producto');
      } else {
        const updated = await productsAPIFull.update(editingProduct.id, apiData);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast('Preventa actualizada');
      }

      setEditingProduct(null);
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar preventa', 'err');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleReleaseExpired = async () => {
    setReleasingExpired(true);
    try {
      const data = await presaleAPI.releaseExpired();
      showToast(data.message);
      await loadReservations();
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Error al liberar reservas', 'err');
    } finally {
      setReleasingExpired(false);
    }
  };

  const handleMarkPaid = async (reservationId: string) => {
    setMarkingPaid(reservationId);
    try {
      await presaleAPI.markPaid(reservationId);
      showToast('Reserva marcada como pagada');
      setReservations((prev) =>
        prev.map((r) => (r.id === reservationId ? { ...r, status: 'PAID' as any } : r))
      );
    } catch (err: any) {
      showToast(err.message || 'Error al marcar como pagado', 'err');
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleReleaseForSale = async () => {
    if (!releaseProduct) return;

    setReleasingProductId(releaseProduct.id);
    try {
      const data = await presaleAPI.releaseForSale(releaseProduct.id);
      showToast(data.message);
      setReleaseProduct(null);
      await Promise.all([loadProducts(), loadReservations()]);
    } catch (err: any) {
      showToast(err.message || 'Error al liberar la preventa', 'err');
    } finally {
      setReleasingProductId(null);
    }
  };

  const handleDeleteReservation = async (reservationId: string) => {
    const reason = window.prompt('Motivo de cancelación de la reserva:');
    if (!reason || !reason.trim()) return;

    const banUser = window.confirm('¿También deseas bloquear a este usuario para futuras preventas?');

    setDeletingId(reservationId);
    try {
      const data = await presaleAPI.adminCancelReservation(reservationId, reason.trim(), banUser);
      showToast(data.message);
      await Promise.all([loadReservations(pagination.page), loadProducts()]);
    } catch (err: any) {
      showToast(err.message || 'Error al cancelar la reserva', 'err');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBlockUserAccess = async (userId: string) => {
    const confirmed = window.confirm('¿Bloquear a este usuario para futuras preventas?');
    if (!confirmed) return;

    setBlockingUserId(userId);
    try {
      const data = await presaleAPI.blockUserAccess(userId);
      showToast(data.message);
      setReservations((prev) =>
        prev.map((r) =>
          r.user.id === userId
            ? { ...r, user: { ...r.user, presaleBanned: true } }
            : r
        )
      );
    } catch (err: any) {
      showToast(err.message || 'Error al bloquear al usuario', 'err');
    } finally {
      setBlockingUserId(null);
    }
  };

  const handleRestoreUserAccess = async (userId: string) => {
    const confirmed = window.confirm('¿Restaurar el acceso a preventas para este usuario?');
    if (!confirmed) return;

    setRestoringUserId(userId);
    try {
      const data = await presaleAPI.restoreUserAccess(userId);
      showToast(data.message);
      setReservations((prev) =>
        prev.map((r) =>
          r.user.id === userId
            ? { ...r, user: { ...r.user, presaleBanned: false } }
            : r
        )
      );
    } catch (err: any) {
      showToast(err.message || 'Error al restaurar el acceso', 'err');
    } finally {
      setRestoringUserId(null);
    }
  };

  // Stats
  const stats = {
    pending: reservations.filter((r) => r.status === 'PENDING').length,
    notified: reservations.filter((r) => r.status === 'NOTIFIED').length,
    paid: reservations.filter((r) => r.status === 'PAID').length,
    expired: reservations.filter((r) => r.status === 'EXPIRED').length,
    total: pagination.total,
  };

  // Filtered by search
  const filtered = reservations.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.user.name.toLowerCase().includes(q) ||
      r.user.email.toLowerCase().includes(q) ||
      r.product.name.toLowerCase().includes(q) ||
      r.product.sku.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
    <div className="space-y-6 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold ${
            toast.type === 'ok'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Preventas</h2>
          <p className="text-muted-foreground text-sm">Gestiona reservas de preventa y confirmación de llegada</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleReleaseExpired}
            disabled={releasingExpired}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-secondary disabled:opacity-60 transition-colors"
            title="Liberar reservas NOTIFIED que superaron 24h sin pago"
          >
            {releasingExpired ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Liberar expiradas
          </button>
          <button
            onClick={() => { loadReservations(); loadProducts(); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
          <Link
            to="/admin/presales/new"
            state={{ openEditor: true }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva preventa
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Pendientes', value: stats.pending, color: 'text-blue-600' },
          { label: 'Notificados', value: stats.notified, color: 'text-amber-600' },
          { label: 'Pagados', value: stats.paid, color: 'text-green-600' },
          { label: 'Expirados', value: stats.expired, color: 'text-zinc-500' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Presale products – confirm arrival */}
      {products.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Productos en preventa</h3>
            <span className="text-xs text-muted-foreground">— Edita, confirma llegada o verifica los datos para convertir las preventas finalizadas en productos</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const activeReservedCount = reservations.filter((r) =>
                r.product.id === p.id && ['PENDING', 'NOTIFIED', 'PAID'].includes(r.status)
              ).length;

              return (
              <PresaleProductCard
                key={p.id}
                product={p}
                activeReservedCount={activeReservedCount}
                onConfirmArrival={handleConfirmArrival}
                onRelease={(prod) => setReleaseProduct(prod)}
                onEdit={(prod) => {
                  setEditorMode('edit');
                  setEditingProduct({
                    ...prod,
                    stock: prod.stock ?? 0,
                  });
                }}
                onConvert={(prod) => {
                  setEditorMode('convert');
                  setEditingProduct({
                    ...prod,
                    status: 'ACTIVE',
                    stock: prod.presaleAvailQty ?? prod.stock ?? 0,
                  });
                }}
                releasingId={releasingProductId}
                loadingId={confirmingId}
              />
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o producto..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
            className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="NOTIFIED">Notificado</option>
            <option value="PAID">Pagado</option>
            <option value="EXPIRED">Expirado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <button
          onClick={() => loadReservations()}
          className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          Aplicar
        </button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No hay reservas que coincidan con los filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notificado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expira</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reservado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
                  const img = r.product.images?.[0];
                  const isExpired =
                    r.status === 'NOTIFIED' &&
                    r.expiresAt &&
                    new Date(r.expiresAt) < new Date();

                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                      {/* Customer */}
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.user.name}</p>
                        <p className="text-xs text-muted-foreground">{r.user.email}</p>
                        {r.user.presaleBanned && (
                          <p className="text-[11px] text-red-600 font-semibold mt-1">Bloqueado para preventas</p>
                        )}
                      </td>
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-secondary overflow-hidden flex-shrink-0">
                            <ImageWithFallback src={img || ''} alt={r.product.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-medium leading-snug">{r.product.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{r.product.sku}</p>
                          </div>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                          <cfg.Icon className="w-3 h-3" />
                          {isExpired ? 'Por liberar' : cfg.label}
                        </span>
                        {r.cancellationReason && (
                          <p className="text-[11px] text-muted-foreground mt-1 max-w-56">Motivo: {r.cancellationReason}</p>
                        )}
                      </td>
                      {/* Notified at */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.notifiedAt ? new Date(r.notifiedAt).toLocaleString('es-CL') : '—'}
                      </td>
                      {/* Expires at */}
                      <td className="px-4 py-3 text-xs">
                        {r.expiresAt ? (
                          <span className={isExpired ? 'text-red-500 font-semibold' : 'text-muted-foreground'}>
                            {new Date(r.expiresAt).toLocaleString('es-CL')}
                          </span>
                        ) : '—'}
                      </td>
                      {/* Created at */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString('es-CL')}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.status === 'NOTIFIED' && (
                            <button
                              onClick={() => handleMarkPaid(r.id)}
                              disabled={markingPaid === r.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-500 disabled:opacity-60 transition-colors"
                            >
                              {markingPaid === r.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              Marcar pagado
                            </button>
                          )}

                          {r.status === 'EXPIRED' && !r.user.presaleBanned && (
                            <button
                              onClick={() => handleBlockUserAccess(r.user.id)}
                              disabled={blockingUserId === r.user.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500 disabled:opacity-60 transition-colors"
                            >
                              {blockingUserId === r.user.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Ban className="w-3 h-3" />
                              )}
                              Bloquear usuario
                            </button>
                          )}

                          {r.user.presaleBanned && (
                            <button
                              onClick={() => handleRestoreUserAccess(r.user.id)}
                              disabled={restoringUserId === r.user.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 disabled:opacity-60 transition-colors"
                            >
                              {restoringUserId === r.user.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              Restaurar acceso
                            </button>
                          )}

                          {(r.status === 'PENDING' || r.status === 'NOTIFIED') && (
                            <button
                              onClick={() => handleDeleteReservation(r.id)}
                              disabled={deletingId === r.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 disabled:opacity-60 transition-colors"
                            >
                              {deletingId === r.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => loadReservations(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                p === pagination.page
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-secondary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>

      {/* Modal de edición de preventa */}
      {editingProduct && (
        <Modal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          title={editorMode === 'convert' ? `Verificar y convertir: ${editingProduct.name}` : `Editar preventa: ${editingProduct.name}`}
          size="lg"
        >
          <ProductEditor
            product={editingProduct as any}
            onSave={handleEditProduct}
            onCancel={() => setEditingProduct(null)}
            onUploadImage={async (file) => {
              const result = await productsAPI.uploadImage(file);
              return result.url;
            }}
            verificationMode={editorMode === 'convert'}
            submitLabel={editorMode === 'convert' ? 'Verificar y convertir a producto' : 'Guardar preventa'}
          />
          {savingProduct && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </Modal>
      )}

      {releaseProduct && (
        <Modal
          isOpen={!!releaseProduct}
          onClose={() => setReleaseProduct(null)}
          title={`Liberar preventa: ${releaseProduct.name}`}
          size="sm"
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta acción liberará la preventa para venderse como producto normal de inmediato,
            aunque no tenga reservas o esté expirada.
          </p>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setReleaseProduct(null)}
              disabled={releasingProductId === releaseProduct.id}
              className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleReleaseForSale}
              disabled={releasingProductId === releaseProduct.id}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60 transition-colors"
            >
              {releasingProductId === releaseProduct.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PackageCheck className="w-4 h-4" />
              )}
              Liberar
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}

