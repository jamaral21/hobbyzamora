import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CheckCircle2, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { authAPI, ApiError } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/design-system/Card';
import { Input } from '../../components/design-system/Input';
import { Button } from '../../components/design-system/Button';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tokenMissing = !token;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (tokenMissing) {
      setError('El enlace no incluye un token válido. Solicita uno nuevo.');
      return;
    }

    if (password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await authAPI.resetPassword(token, password);
      setSuccess(response.message || 'Contraseña restablecida exitosamente.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo restablecer la contraseña. Intenta nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-16 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,214,10,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(0,212,255,0.16),transparent_30%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,214,10,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,214,10,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <section className="max-w-xl space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-primary/70">Seguridad de cuenta</p>
          <h1 className="text-foreground">Restablece tu contraseña sin salir de HobbyZamora</h1>
          <p className="max-w-lg text-base leading-7 text-muted-foreground">
            El enlace de recuperación ya apunta a esta página. Define una nueva contraseña y el token quedará invalidado una vez usado.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-primary/20 bg-card/80 px-4 py-2">Token de un solo uso</span>
            <span className="rounded-full border border-primary/20 bg-card/80 px-4 py-2">Vigencia de 1 hora</span>
            <span className="rounded-full border border-primary/20 bg-card/80 px-4 py-2">Sin inicio de sesión previo</span>
          </div>
        </section>

        <Card className="w-full max-w-lg backdrop-blur" glow="primary">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              {success ? <CheckCircle2 className="h-6 w-6" /> : tokenMissing ? <ShieldAlert className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
            </div>
            <CardTitle>
              {success ? 'Contraseña actualizada' : tokenMissing ? 'Enlace inválido' : 'Nueva contraseña'}
            </CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              {success
                ? 'Ya puedes iniciar sesión con tu nueva contraseña.'
                : tokenMissing
                  ? 'Este enlace no contiene el token necesario para completar el cambio.'
                  : 'Ingresa una contraseña nueva para completar el restablecimiento.'}
            </p>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
                  {success}
                </div>
                <Link to="/" className="block">
                  <Button fullWidth size="lg">Ir al inicio</Button>
                </Link>
                <Link to="/" className="block text-center text-sm text-muted-foreground transition-colors hover:text-primary">
                  Volver al inicio
                </Link>
              </div>
            ) : tokenMissing ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Solicita un nuevo correo de recuperación desde el formulario de inicio de sesión.
                </div>
                <Link to="/" className="block">
                  <Button fullWidth size="lg" variant="outline">Ir al inicio</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nueva contraseña"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <Input
                  label="Confirmar contraseña"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repite tu nueva contraseña"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />

                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" fullWidth size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    'Guardar nueva contraseña'
                  )}
                </Button>

                <p className="text-center text-xs leading-6 text-muted-foreground">
                  Si el token expiró, vuelve a solicitar el correo de recuperación.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}