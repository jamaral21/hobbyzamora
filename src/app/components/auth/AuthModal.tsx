/// <reference types="vite/client" />
import { useState, useEffect, useRef } from 'react';
import { Loader2, LogIn, UserPlus, ArrowLeft, Mail, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../lib/api';
import { Input } from '../design-system/Input';
import { Button } from '../design-system/Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function AuthModal({ isOpen, onClose, message = 'Inicia sesión para continuar' }: AuthModalProps) {
  const { isAuthenticated, login, register, googleLogin } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' });
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Close modal when user logs in
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('login');
      setError('');
      setForgotSuccess(false);
      setForm({ email: '', password: '', name: '', phone: '' });
    }
  }, [isOpen]);

  // Google button
  useEffect(() => {
    if (!isOpen || isAuthenticated) return;

    const initGoogle = () => {
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          locale: 'es',
        });
      }
    };

    if (window.google) {
      initGoogle();
    } else {
      const timer = setInterval(() => {
        if (window.google) {
          clearInterval(timer);
          initGoogle();
        }
      }, 100);
      return () => clearInterval(timer);
    }
  }, [isOpen, isAuthenticated, mode]);

  const handleGoogleResponse = async (response: any) => {
    if (response.credential) {
      setError('');
      setIsSubmitting(true);
      try {
        await googleLogin(response.credential);
      } catch (err: any) {
        setError(err?.message || 'Error al autenticar con Google');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (mode === 'forgot') {
        await authAPI.forgotPassword(form.email);
        setForgotSuccess(true);
      } else if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) {
          setError('El nombre es obligatorio');
          setIsSubmitting(false);
          return;
        }
        await register(form.email, form.password, form.name, form.phone || undefined);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al autenticar. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {mode === 'login' ? 'Iniciar Sesión' : mode === 'register' ? 'Crear Cuenta' : 'Recuperar Contraseña'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {mode === 'forgot' && forgotSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
              </p>
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
                onClick={() => { setMode('login'); setForgotSuccess(false); setError(''); }}
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <>
                  <Input
                    label="Nombre completo"
                    placeholder="Juan Pérez"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    label="Teléfono (opcional)"
                    type="tel"
                    placeholder="+56 9 1234 5678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </>
              )}
              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {mode !== 'forgot' && (
                <div>
                  <Input
                    label="Contraseña"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  {mode === 'login' && (
                    <div className="text-right mt-1">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => { setMode('forgot'); setError(''); }}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" fullWidth size="lg" disabled={isSubmitting} className="mt-1">
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {mode === 'forgot' ? 'Enviando...' : mode === 'login' ? 'Ingresando...' : 'Creando cuenta...'}
                  </>
                ) : mode === 'login' ? (
                  <><LogIn className="w-4 h-4 mr-2" />Iniciar Sesión</>
                ) : mode === 'register' ? (
                  <><UserPlus className="w-4 h-4 mr-2" />Crear Cuenta</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" />Enviar enlace</>
                )}
              </Button>

              {mode === 'forgot' && (
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mx-auto"
                  onClick={() => { setMode('login'); setError(''); }}
                >
                  <ArrowLeft className="w-3 h-3" /> Volver al inicio de sesión
                </button>
              )}
            </form>
          )}

          {/* Google button */}
          {mode !== 'forgot' && !forgotSuccess && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-3 text-muted-foreground">o</span>
                </div>
              </div>
              <div ref={googleButtonRef} className="flex justify-center" />
            </>
          )}

          {mode !== 'forgot' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              >
                {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
