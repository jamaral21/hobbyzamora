import { useEffect, useMemo, useState } from 'react';
import { Star, CheckCircle, XCircle, Image, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Badge } from '../../components/design-system/Badge';
import { reviewsAPI, type Review } from '../../lib/api';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export default function ReviewsPage() {
  const [filter, setFilter] = useState<'ALL' | ReviewStatus>('ALL');
  const [search, setSearch] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const searchParam = useMemo(() => search.trim() || undefined, [search]);

  const loadReviews = async (page = 1, query = searchParam) => {
    setIsLoading(true);
    try {
      const data = await reviewsAPI.adminList({ status: filter, search: query, page, limit: 20 });
      setReviews(data.reviews);
      setPagination(data.pagination);
      setCounts({
        pending: data.statusCounts.PENDING || 0,
        approved: data.statusCounts.APPROVED || 0,
        rejected: data.statusCounts.REJECTED || 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadReviews(1, searchParam); }, 400);
    return () => window.clearTimeout(timeout);
  }, [filter, searchParam]);

  const handleApprove = async (id: string) => {
    await reviewsAPI.updateStatus(id, 'APPROVED');
    await loadReviews(pagination.page, searchParam);
  };

  const handleReject = async (id: string) => {
    await reviewsAPI.updateStatus(id, 'REJECTED');
    await loadReviews(pagination.page, searchParam);
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

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar cliente, producto o pedido..."
            className="w-full rounded-lg border border-border bg-input-background py-2 pl-9 pr-3 text-sm text-foreground"
          />
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {reviews.length === 0 ? (
            <Card className="text-center py-12">
              <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay reseñas en esta categoría</p>
            </Card>
          ) : (
            reviews.map((review) => (
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

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Página {pagination.page} de {pagination.totalPages} ({pagination.total} reseñas)</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => void loadReviews(pagination.page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" disabled={pagination.page >= pagination.totalPages} onClick={() => void loadReviews(pagination.page + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
