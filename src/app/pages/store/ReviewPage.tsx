import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Star, Camera, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Select, Textarea } from '../../components/design-system/Input';
import { reviewsAPI } from '../../lib/api';

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [orderInfo, setOrderInfo] = useState<null | Awaited<ReturnType<typeof reviewsAPI.getByToken>>>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadToken() {
      if (!token) {
        setError('Link de reseña inválido');
        setIsLoading(false);
        return;
      }

      try {
        const payload = await reviewsAPI.getByToken(token);
        if (!isMounted) return;
        setOrderInfo(payload);
        const firstPendingItem = payload.items.find((item) => !item.alreadyReviewed);
        setSelectedProductId(firstPendingItem?.productId || payload.items[0]?.productId || '');
      } catch (err: any) {
        if (!isMounted) return;
        setError(err?.message || 'No se pudo cargar la reseña');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadToken();
    return () => {
      isMounted = false;
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [token]);

  const availableProducts = useMemo(
    () => orderInfo?.items.filter((item) => !item.alreadyReviewed) || [],
    [orderInfo]
  );

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (rating === 0 || !token || !selectedProductId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const upload = await reviewsAPI.uploadPhoto(photoFile);
        photoUrl = upload.url;
      }

      await reviewsAPI.create({
        token,
        productId: selectedProductId,
        rating,
        comment,
        photoUrl,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar la reseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !orderInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center py-12">
          <h1 className="text-2xl font-bold text-foreground mb-2">No pudimos abrir esta reseña</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center py-12">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">¡Gracias por tu reseña!</h1>
          <p className="text-muted-foreground">
            Tu opinión nos ayuda a mejorar y ayuda a otros compradores a decidir.
          </p>
          <a href="/" className="inline-block mt-6">
            <Button variant="outline">Visitar la tienda</Button>
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="HobbyZamora" className="h-12 mx-auto mb-4 brightness-200" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Cuéntanos tu experiencia</h1>
          <p className="text-muted-foreground">
            Tu reseña ayuda a otros compradores y nos motiva a seguir mejorando
          </p>
        </div>

        <Card className="space-y-6">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Producto</label>
            <Select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} disabled={availableProducts.length === 0}>
              {availableProducts.map((item) => (
                <option key={item.productId} value={item.productId}>
                  {item.name}{item.variantName ? ` - ${item.variantName}` : ''}
                </option>
              ))}
            </Select>
            {availableProducts.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">Todos los productos de esta orden ya tienen reseña.</p>
            )}
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">¿Cómo calificas tu compra?</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-primary fill-primary'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {rating === 5 ? '¡Excelente!' : rating === 4 ? 'Muy bueno' : rating === 3 ? 'Regular' : rating === 2 ? 'Malo' : 'Muy malo'}
              </p>
            )}
          </div>

          {/* Comment */}
          <Textarea
            label="Tu comentario (opcional)"
            placeholder="Cuéntanos qué te pareció el producto, la entrega, el empaque..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />

          {/* Photo upload */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Foto del producto (opcional)</label>
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-lg text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 transition-colors">
                <Camera className="w-6 h-6 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Subir foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            )}
          </div>

          {/* Submit */}
          <Button fullWidth size="lg" onClick={handleSubmit} disabled={rating === 0 || isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            ) : (
              'Enviar Reseña'
            )}
          </Button>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          {rating === 0 && (
            <p className="text-xs text-muted-foreground text-center">Selecciona al menos una estrella para continuar</p>
          )}
        </Card>
      </div>
    </div>
  );
}
