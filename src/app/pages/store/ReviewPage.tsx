import { useState } from 'react';
import { useParams } from 'react-router';
import { Star, Camera, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { Input, Textarea } from '../../components/design-system/Input';

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      // TODO: Backend TICKET-011b — POST /api/reviews with token, rating, comment, photo
      // For now, simulate success
      await new Promise((r) => setTimeout(r, 1500));
      setSubmitted(true);
    } catch {
      // handle error
    } finally {
      setIsSubmitting(false);
    }
  };

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

          {rating === 0 && (
            <p className="text-xs text-muted-foreground text-center">Selecciona al menos una estrella para continuar</p>
          )}
        </Card>
      </div>
    </div>
  );
}
