import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Input } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { ordersAPI, wishlistAPI, Order, WishlistItem } from '../../lib/api';
import { User, Package, LogOut, Loader2, ChevronRight, Heart, X, ShoppingCart, Camera } from 'lucide-react';
import { useCartStore } from '../../lib/store';

export default function AccountPage() {
  return (
    <StoreLayout>
      <RequireAuth message="Inicia sesión para ver tu cuenta">
        <AccountContent />
      </RequireAuth>
    </StoreLayout>
  );
}

function AccountContent() {
  const { user, logout, updateProfile, uploadAvatar } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const { addItem } = useCartStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ordersAPI.getMyOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoadingOrders(false));

    wishlistAPI.getAll()
      .then(setWishlist)
      .catch(() => {})
      .finally(() => setLoadingWishlist(false));
  }, []);

  const handleRemoveWishlist = async (productId: string) => {
    setRemovingId(productId);
    try {
      await wishlistAPI.remove(productId);
      setWishlist((prev) => prev.filter((item) => item.productId !== productId));
    } catch {
      // silently fail
    } finally {
      setRemovingId(null);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ name: form.name, phone: form.phone || undefined });
      setIsEditing(false);
    } catch {
      // mantener edición abierta en caso de error
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(file);
    } catch {
      // silently fail
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const statusColor = (status: string): 'success' | 'info' | 'danger' | 'warning' => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'SHIPPED':
      case 'PROCESSING': return 'info';
      case 'CANCELLED':
      case 'REFUNDED': return 'danger';
      default: return 'warning';
    }
  };

  const statusLabel: Record<string, string> = {
    PENDING: 'Pendiente',
    PROCESSING: 'En Proceso',
    SHIPPED: 'Enviado',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <h1 className="text-primary">MI CUENTA</h1>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || 'Perfil'}
                    className="w-12 h-12 rounded-full object-cover border border-primary/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
                  title="Cambiar foto de perfil"
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
              </div>
              <CardTitle>Perfil</CardTitle>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />

          {isEditing ? (
            <div className="space-y-4">
              <Input
                label="Nombre"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                label="Teléfono"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <div className="flex gap-3">
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : 'Guardar'}
                </Button>
                <Button variant="outline" onClick={() => { setIsEditing(false); setForm({ name: user?.name || '', phone: user?.phone || '' }); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Nombre:</span> <span className="text-foreground">{user?.name}</span></p>
              <p><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{user?.email}</span></p>
              {user?.phone && (
                <p><span className="text-muted-foreground">Teléfono:</span> <span className="text-foreground">{user.phone}</span></p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pedidos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-accent" />
            </div>
            <CardTitle>Mis Pedidos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Aún no tienes pedidos</p>
              <Link to="/store/products">
                <Button variant="outline">Explorar Productos</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/store/order-confirmation?orderId=${order.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/25 hover:bg-secondary/50 transition-all"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground font-[family-name:var(--font-mono)]">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {' · '}{order.items.length} {order.items.length === 1 ? 'artículo' : 'artículos'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary font-[family-name:var(--font-mono)]">${order.total.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</p>
                      <Badge variant={statusColor(order.status)} className="text-xs">
                        {statusLabel[order.status] || order.status}
                      </Badge>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Favoritos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <CardTitle>Mis Favoritos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingWishlist ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : wishlist.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Aún no tienes productos favoritos</p>
              <Link to="/store/products">
                <Button variant="outline">Explorar Productos</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wishlist.map((item) => {
                const p = item.product;
                const imageUrl = Array.isArray(p.images) ? p.images[0] : p.images;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/25 hover:bg-secondary/30 transition-all group"
                  >
                    <Link to={`/store/product/${p.id}`} className="shrink-0">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary">
                        {imageUrl ? (
                          <img src={imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <ShoppingCart className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/store/product/${p.id}`}>
                        <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">{p.name}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                      <p className="text-sm font-bold text-primary font-[family-name:var(--font-mono)] mt-0.5">
                        ${Number(p.price).toLocaleString('es-CL')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveWishlist(p.id)}
                      disabled={removingId === p.id}
                      title="Quitar de favoritos"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {removingId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cerrar Sesión */}
      <Button variant="outline" onClick={logout} className="text-destructive border-destructive/30 hover:bg-destructive/10">
        <LogOut className="w-4 h-4 mr-2" />
        Cerrar Sesión
      </Button>
    </div>
  );
}
