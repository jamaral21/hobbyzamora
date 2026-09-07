import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { StoreLayout } from '../../components/layout/StoreLayout';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/design-system/Card';
import { Input } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { ordersAPI, wishlistAPI, presaleAPI, addressesAPI, Order, WishlistItem, PresaleReservation, type Address } from '../../lib/api';
import { User, Package, LogOut, Loader2, ChevronRight, Heart, X, ShoppingCart, Camera, Clock, CheckCircle, XCircle, AlertCircle, ShoppingBag, Sparkles, MapPin, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { useCartStore } from '../../lib/store';
import { formatChileDate, formatChileDateTime } from '../../lib/chileDate';

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
  const [presales, setPresales] = useState<PresaleReservation[]>([]);
  const [loadingPresales, setLoadingPresales] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Chile',
    phone: '',
    isDefault: false,
  });
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const { addItem, items: cartItems } = useCartStore();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({ name: user?.name || '', phone: user?.phone || '' });

    if (!user?.id) {
      setOrders([]);
      setWishlist([]);
      setPresales([]);
      setLoadingOrders(false);
      setLoadingWishlist(false);
      setLoadingPresales(false);
      setLoadingAddresses(false);
      return;
    }

    setLoadingOrders(true);
    setLoadingWishlist(true);
    setLoadingPresales(true);
    setLoadingAddresses(true);
    setOrders([]);
    setWishlist([]);
    setPresales([]);
    setAddresses([]);

    ordersAPI.getMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));

    wishlistAPI.getAll()
      .then(setWishlist)
      .catch(() => setWishlist([]))
      .finally(() => setLoadingWishlist(false));

    presaleAPI.getMyReservations()
      .then((data) => setPresales(data.reservations))
      .catch(() => setPresales([]))
      .finally(() => setLoadingPresales(false));

    addressesAPI.getAll()
      .then(setAddresses)
      .catch(() => setAddresses([]))
      .finally(() => setLoadingAddresses(false));
  }, [user?.id]);

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

  const refreshAddresses = async () => {
    try {
      const data = await addressesAPI.getAll();
      setAddresses(data);
    } catch {
      // keep silent
    }
  };

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm({
      name: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Chile',
      phone: '',
      isDefault: false,
    });
  };

  const startCreateAddress = () => {
    resetAddressForm();
    setIsAddressFormOpen(true);
  };

  const startEditAddress = (address: Address) => {
    setEditingAddressId(address.id);
    setAddressForm({
      name: address.name,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      phone: address.phone || '',
      isDefault: address.isDefault,
    });
    setIsAddressFormOpen(true);
  };

  const handleSaveAddress = async () => {
    setSavingAddress(true);
    try {
      const payload = {
        ...addressForm,
        phone: addressForm.phone || undefined,
      };

      if (editingAddressId) {
        await addressesAPI.update(editingAddressId, payload);
      } else {
        await addressesAPI.create(payload);
      }

      setIsAddressFormOpen(false);
      resetAddressForm();
      await refreshAddresses();
    } catch {
      // keep form open on error
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('¿Eliminar esta dirección guardada?')) return;

    try {
      await addressesAPI.delete(id);
      await refreshAddresses();
    } catch {
      // keep silent
    }
  };

  const handleSetDefaultAddress = async (address: Address) => {
    try {
      await addressesAPI.update(address.id, { isDefault: true });
      await refreshAddresses();
    } catch {
      // keep silent
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
                      {formatChileDate(order.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}
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

      {/* Direcciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Direcciones Guardadas</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={startCreateAddress}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva dirección
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingAddresses ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No tienes direcciones guardadas</p>
              <Button variant="outline" onClick={startCreateAddress}>Crear primera dirección</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <div key={address.id} className="rounded-lg border border-border p-4 bg-secondary/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{address.name}</p>
                        {address.isDefault && <Badge variant="success" className="text-xs"><Check className="w-3 h-3 mr-1" />Predeterminada</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{address.street}</p>
                      <p className="text-sm text-muted-foreground">{address.city}, {address.state} · {address.zipCode} · {address.country}</p>
                      {address.phone && <p className="text-sm text-muted-foreground">Teléfono: {address.phone}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {!address.isDefault && (
                        <Button variant="outline" size="sm" onClick={() => handleSetDefaultAddress(address)}>
                          <Check className="w-4 h-4 mr-2" />
                          Predeterminada
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => startEditAddress(address)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteAddress(address.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isAddressFormOpen && (
            <div className="rounded-lg border border-border p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{editingAddressId ? 'Editar dirección' : 'Nueva dirección'}</h3>
                <button
                  type="button"
                  onClick={() => { setIsAddressFormOpen(false); resetAddressForm(); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cerrar
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nombre / Alias" value={addressForm.name} onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })} />
                <Input label="Teléfono" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} />
              </div>
              <Input label="Dirección" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Ciudad" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
                <Input label="Región" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Código Postal" value={addressForm.zipCode} onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })} />
                <Input label="País" value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                />
                Usar como dirección predeterminada
              </label>
              <div className="flex gap-3">
                <Button onClick={handleSaveAddress} disabled={savingAddress}>
                  {savingAddress ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : 'Guardar dirección'}
                </Button>
                <Button variant="outline" onClick={() => { setIsAddressFormOpen(false); resetAddressForm(); }}>
                  Cancelar
                </Button>
              </div>
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

      {/* Mis Preventas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <CardTitle>Mis Preventas</CardTitle>
            </div>
            <Link to="/store/presales">
              <Button variant="outline" size="sm">Ver todas</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPresales ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : presales.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Aún no tienes preventas reservadas</p>
              <Link to="/store/presales">
                <Button variant="outline">Ver preventas disponibles</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {presales.map((r) => {
                const img = r.product.images?.[0];
                const statusMap: Record<string, { label: string; icon: any; color: string }> = {
                  PENDING:  { label: 'Reservado',        icon: Clock,         color: 'text-blue-500' },
                  NOTIFIED: { label: '¡Llegó! Pagar ya', icon: AlertCircle,   color: 'text-amber-500' },
                  PAID:     { label: 'Pagado',           icon: CheckCircle,   color: 'text-emerald-500' },
                  EXPIRED:  { label: 'Expirado',         icon: XCircle,       color: 'text-muted-foreground' },
                  CANCELLED:{ label: 'Cancelado',        icon: XCircle,       color: 'text-red-500' },
                };
                const s = statusMap[r.status] ?? statusMap.PENDING;
                const StatusIcon = s.icon;
                const isNotified = r.status === 'NOTIFIED';

                return (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isNotified
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-border hover:border-primary/25 hover:bg-secondary/30'
                    }`}
                  >
                    {/* Thumb */}
                    <Link to={`/store/product/${r.productId}`} className="shrink-0">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary">
                        {img ? (
                          <img src={img} alt={r.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/store/product/${r.productId}`}>
                        <p className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors">
                          {r.product.name}
                        </p>
                      </Link>
                      <p className="text-sm font-bold text-primary font-[family-name:var(--font-mono)] mt-0.5">
                        ${Number(r.product.price).toLocaleString('es-CL')}
                      </p>
                      <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${s.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {s.label}
                        {isNotified && r.expiresAt && (
                          <span className="text-amber-500/70 ml-1">
                            · expira {formatChileDateTime(r.expiresAt, { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CTA for notified */}
                    {isNotified && (
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          addItem(r.product as any, r.quantity);
                        }}
                      >
                        <ShoppingBag className="w-3.5 h-3.5 mr-1" />
                        {cartItems.some(i => i.productId === r.productId) ? 'Sumar al carrito' : 'Al carrito'}
                      </Button>
                    )}
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
