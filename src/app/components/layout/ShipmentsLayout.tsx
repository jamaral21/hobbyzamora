import { useState } from 'react';
import { Outlet } from 'react-router';
import { Loader2 } from 'lucide-react';
import { ShipmentsSidebar } from './ShipmentsSidebar';
import { ShipmentsRoleProvider } from '../../contexts/ShipmentsRoleContext';
import { ShipmentsDataProvider } from '../../contexts/ShipmentsDataContext';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Button } from '../design-system/Button';
import { Input } from '../design-system/Input';

function ShipmentsLayoutInner() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ShipmentsSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated && user && (user.role === 'ADMIN' || user.role === 'STAFF')) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Acceso restringido</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Debes iniciar sesión como administrador para entrar a Shipments.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@hobbyzamora.com" />
          <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" fullWidth disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</> : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function ShipmentsApp() {
  return (
    <RequireAdminAuth>
      <ShipmentsRoleProvider>
        <ShipmentsDataProvider>
          <ShipmentsLayoutInner />
        </ShipmentsDataProvider>
      </ShipmentsRoleProvider>
    </RequireAdminAuth>
  );
}
