import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { Modal } from '../../components/design-system/Modal';
import { Select } from '../../components/design-system/Input';
import { adminUsersAPI, type AdminUser } from '../../lib/api';
import { formatChileDate } from '../../lib/chileDate';

const SHIPMENTS_ROLES = [
  { value: 'admin', label: 'Admin Shipments' },
  { value: 'japon', label: 'Japón' },
  { value: 'chile', label: 'Chile' },
  { value: 'contador', label: 'Contador' },
] as const;

type AppRole = 'ADMIN' | 'STAFF';
type ShipmentsRole = 'admin' | 'japon' | 'chile' | 'contador';

interface FormState {
  name: string;
  email: string;
  password: string;
  role: AppRole;
  shipmentsRole: ShipmentsRole;
}

const defaultForm: FormState = {
  name: '',
  email: '',
  password: '',
  role: 'STAFF',
  shipmentsRole: 'chile',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const searchParam = useMemo(() => search.trim() || undefined, [search]);

  const loadUsers = async (page = 1, query = searchParam) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminUsersAPI.getAll({ search: query, page, limit: 50 });
      setUsers(response.users || []);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar los usuarios');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadUsers(1, searchParam); }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchParam]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      shipmentsRole: user.shipmentsRole,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Nombre y email son obligatorios');
      return;
    }

    if (!editingUser && !form.password.trim()) {
      setError('La contraseña es obligatoria para crear usuario');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingUser) {
        await adminUsersAPI.update(editingUser.id, {
          name: form.name.trim(),
          role: form.role,
          shipmentsRole: form.shipmentsRole,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
        });
      } else {
        await adminUsersAPI.create({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password.trim(),
          role: form.role,
          shipmentsRole: form.shipmentsRole,
        });
      }

      setIsModalOpen(false);
      setEditingUser(null);
      setForm(defaultForm);
      await loadUsers(pagination.page, searchParam);
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar el usuario');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl text-foreground mb-2">Usuarios Admin</h1>
            <p className="text-muted-foreground">Gestiona usuarios del panel y su rol en Shipments.</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nuevo Usuario Admin
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full rounded-lg border border-border bg-input-background py-2 pl-9 pr-3 text-sm text-foreground"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2" />
            No hay usuarios admin configurados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol Admin</TableHead>
                <TableHead>Rol Shipments</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{user.shipmentsRole}</TableCell>
                  <TableCell>{formatChileDate(user.createdAt)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEdit(user)}>Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Página {pagination.page} de {pagination.totalPages} ({pagination.total} usuarios)</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => void loadUsers(pagination.page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" disabled={pagination.page >= pagination.totalPages} onClick={() => void loadUsers(pagination.page + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (isSaving) return;
          setIsModalOpen(false);
        }}
        title={editingUser ? 'Editar Usuario Admin' : 'Crear Usuario Admin'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-foreground mb-1">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm text-foreground mb-1">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
              placeholder="admin@hobbyzamora.cl"
              disabled={Boolean(editingUser)}
            />
          </div>

          <div>
            <label className="block text-sm text-foreground mb-1">Contraseña {editingUser ? '(opcional)' : ''}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-input-background text-foreground"
              placeholder={editingUser ? 'Solo si quieres cambiarla' : 'Mínimo 8 caracteres'}
            />
          </div>

          <Select
            label="Rol Admin"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as AppRole }))}
          >
            <option value="STAFF">STAFF</option>
            <option value="ADMIN">ADMIN</option>
          </Select>

          <Select
            label="Rol Shipments"
            value={form.shipmentsRole}
            onChange={(e) => setForm((prev) => ({ ...prev, shipmentsRole: e.target.value as ShipmentsRole }))}
          >
            {SHIPMENTS_ROLES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </Select>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
