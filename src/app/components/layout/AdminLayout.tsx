import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Button } from '../design-system/Button';
import { Input } from '../design-system/Input';

function AdminLogin() {
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm p-8 bg-card rounded-xl shadow-lg border border-border">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="HobbyZamora" className="w-12 h-12 rounded-xl mx-auto mb-3 object-contain" />
          <h1 className="text-xl text-foreground font-body">HobbyZamora Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Inicia sesión para continuar</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@hobbyzamora.com" />
          <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Iniciando sesión...</> : 'Iniciar Sesión'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    return <AdminLogin />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
