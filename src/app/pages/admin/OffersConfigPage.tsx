import { useEffect, useRef, useState } from 'react';
import { AlertCircle, BadgePercent, CheckCircle, ImagePlus, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { offersSectionAPI, productsAPI } from '../../lib/api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const defaultOffersConfig = {
  title: 'Cyber Week',
  bannerUrl: '',
  startDate: '',
  endDate: '',
};

type OffersConfig = typeof defaultOffersConfig;

export default function OffersConfigPage() {
  const { user } = useAdminAuth();
  const [config, setConfig] = useState<OffersConfig>(defaultOffersConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    offersSectionAPI.getConfig()
      .then((result) => {
        if (!cancelled) setConfig(result);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo cargar la configuración de ofertas.',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    const title = config.title.trim();
    if (!title || title.length > 40) {
      setMessage({ type: 'error', text: 'El nombre debe tener entre 1 y 40 caracteres.' });
      return;
    }
    if (config.bannerUrl && (!config.startDate || !config.endDate)) {
      setMessage({ type: 'error', text: 'Configura la fecha de inicio y término para publicar el banner.' });
      return;
    }
    if (config.startDate && config.endDate && config.startDate > config.endDate) {
      setMessage({ type: 'error', text: 'La fecha de término debe ser igual o posterior a la fecha de inicio.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const savedConfig = await offersSectionAPI.setConfig({ ...config, title, bannerUrl: config.bannerUrl.trim() });
      setConfig(savedConfig);
      setMessage({ type: 'success', text: 'Configuración de ofertas guardada.' });
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo guardar la configuración de ofertas.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadBanner = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    setMessage(null);
    try {
      const result = await productsAPI.uploadImage(file);
      setConfig((current) => ({ ...current, bannerUrl: result.url }));
      setMessage({ type: 'success', text: 'Banner subido. Guarda la configuración para publicarlo.' });
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo subir el banner.',
      });
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start gap-4">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
            <BadgePercent className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl text-foreground">Ofertas</h1>
            <p className="mt-1 text-muted-foreground">
              Configura el nombre, banner y fechas de la sección de ofertas de la tienda.
            </p>
          </div>
        </header>

        {user?.role !== 'ADMIN' ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Solo los administradores pueden modificar la configuración de ofertas.
          </div>
        ) : (
          <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
            <div>
              <label htmlFor="offers-title" className="mb-1.5 block text-sm font-medium text-foreground">
                Nombre de la sección
              </label>
              <input
                id="offers-title"
                type="text"
                value={config.title}
                maxLength={40}
                onChange={(event) => setConfig((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-foreground"
                placeholder="Ej. Cyber Week"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-medium text-foreground">Banner del carrusel principal</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Se agregará al inicio del carrusel mientras la oferta esté vigente y existan productos activos con descuento.
                </p>
              </div>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleUploadBanner}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={isLoading || isUploadingBanner}
                >
                  {isUploadingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {isUploadingBanner ? 'Subiendo banner...' : config.bannerUrl ? 'Cambiar banner' : 'Subir banner'}
                </Button>
                {config.bannerUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfig((current) => ({ ...current, bannerUrl: '' }))}
                    disabled={isLoading || isUploadingBanner}
                  >
                    Quitar banner
                  </Button>
                )}
              </div>
              {config.bannerUrl && (
                <img
                  src={config.bannerUrl}
                  alt="Vista previa del banner de ofertas"
                  className="max-h-64 w-full rounded-lg border border-border object-cover"
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="offers-start-date" className="mb-1.5 block text-sm font-medium text-foreground">
                  Fecha de inicio
                </label>
                <input
                  id="offers-start-date"
                  type="date"
                  value={config.startDate}
                  onChange={(event) => setConfig((current) => ({ ...current, startDate: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-foreground"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="offers-end-date" className="mb-1.5 block text-sm font-medium text-foreground">
                  Fecha de término
                </label>
                <input
                  id="offers-end-date"
                  type="date"
                  value={config.endDate}
                  min={config.startDate || undefined}
                  onChange={(event) => setConfig((current) => ({ ...current, endDate: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-foreground"
                  disabled={isLoading}
                />
              </div>
            </div>

            {message && (
              <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                message.type === 'success'
                  ? 'border-[#00e676]/20 bg-[#00e676]/10 text-foreground'
                  : 'border-destructive/20 bg-destructive/10 text-destructive'
              }`}>
                {message.type === 'success'
                  ? <CheckCircle className="h-4 w-4 text-[#00e676]" />
                  : <AlertCircle className="h-4 w-4" />}
                {message.text}
              </div>
            )}

            <div className="flex justify-end border-t border-border pt-4">
              <Button
                onClick={handleSave}
                disabled={isLoading || isSaving || isUploadingBanner || !config.title.trim()}
              >
                {isLoading || isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isLoading ? 'Cargando...' : isSaving ? 'Guardando...' : 'Guardar configuración'}
              </Button>
            </div>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
