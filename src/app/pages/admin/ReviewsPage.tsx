import { useMemo, useState } from 'react';
import { Star, CheckCircle, XCircle, Clock, Image, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { useReviews } from '../../hooks/useData';
import { reviewsAPI, type Review } from '../../lib/api';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export default function ReviewsPage() {
  const [filter, setFilter] = useState<'ALL' | ReviewStatus>('ALL');
  const { data, isLoading, refetch } = useReviews({ status: filter, limit: 50 }, { authMode: 'admin' });
  const reviews = useMemo(() => data || [], [data]);

  const filteredReviews = reviews;

  const counts = {
    pending: reviews.filter((r) => r.status === 'PENDING').length,
    approved: reviews.filter((r) => r.status === 'APPROVED').length,
    rejected: reviews.filter((r) => r.status === 'REJECTED').length,
  };

  const handleApprove = async (id: string) => {
    await reviewsAPI.updateStatus(id, 'APPROVED');
    await refetch();
  };

  const handleReject = async (id: string) => {
    await reviewsAPI.updateStatus(id, 'REJECTED');
    await refetch();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl text-foreground mb-1">Reseñas</h1>
            <p className="text-muted-foreground text-sm">
              Modera las reseñas de clientes. Solo las aprobadas aparecen en la tienda.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-secondary rounded-lg text-center">
            <p className="text-2xl font-bold text-amber-400">{counts.pending}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg text-center">
            <p className="text-2xl font-bold text-emerald-400">{counts.approved}</p>
            <p className="text-xs text-muted-foreground">Aprobadas</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg text-center">
            <p className="text-2xl font-bold text-destructive">{counts.rejected}</p>
            <p className="text-xs text-muted-foreground">Rechazadas</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {f === 'ALL' ? 'Todas' : f === 'PENDING' ? 'Pendientes' : f === 'APPROVED' ? 'Aprobadas' : 'Rechazadas'}
            </button>
          ))}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {filteredReviews.length === 0 ? (
            <Card className="text-center py-12">
              <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay reseñas en esta categoría</p>
            </Card>
          ) : (
            filteredReviews.map((review) => (
              <Card key={review.id} padding="md">
                <div className="flex items-start gap-4">
                  {/* Photo or placeholder */}
                  <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    {review.photoUrl ? (
                      <img src={review.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Image className="w-6 h-6 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">{review.customerName}</span>
                      <Badge
                        variant={review.status === 'APPROVED' ? 'success' : review.status === 'REJECTED' ? 'danger' : 'warning'}
                        size="sm"
                      >
                        {review.status === 'APPROVED' ? 'Aprobada' : review.status === 'REJECTED' ? 'Rechazada' : 'Pendiente'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{review.productName} · {review.orderNumber}</p>
                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${star <= review.rating ? 'text-primary fill-primary' : 'text-muted-foreground/30'}`}
                        />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-foreground">{review.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{review.createdAt}</p>
                  </div>

                  {/* Actions */}
                  {review.status === 'PENDING' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => handleApprove(review.id)}>
                        <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleReject(review.id)}>
                        <XCircle className="w-3.5 h-3.5" /> Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
