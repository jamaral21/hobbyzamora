import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/design-system/Card';
import { useInstagramStats, useInstagramConversations, useInstagramHealth } from '../../hooks/useData';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/design-system/Button';
import { formatChileDateTime } from '../../lib/chileDate';

export default function InstagramHealthPage() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useInstagramHealth();
  const { data: stats, isLoading: statsLoading } = useInstagramStats();
  const { data: conversations, isLoading: convLoading } = useInstagramConversations();

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Instagram — Estado de conexión</h1>
          <Button variant="outline" size="sm" onClick={refetchHealth}>
            <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
          </Button>
        </div>

        {/* Conexión con Meta */}
        <Card>
          <h2 className="font-semibold text-lg mb-4">Conexión con Meta Graph API</h2>
          {healthLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin w-4 h-4" /> Verificando...</div>
          ) : health?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-500 font-semibold">
                <CheckCircle2 className="w-5 h-5" /> Conectado correctamente a Meta
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li><b>Página/Cuenta:</b> {health.pageName} <span className="text-xs">({health.pageId})</span></li>
                <li><b>Token válido:</b> {health.tokenValid ? '✅ Sí' : '❌ No'}</li>
                <li><b>Expira:</b> {health.tokenExpires === 'never' ? 'Nunca (token permanente)' : health.tokenExpires}</li>
                {health.scopes && health.scopes.length > 0 && (
                  <li><b>Permisos:</b> {health.scopes.join(', ')}</li>
                )}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-500 font-semibold">
              <XCircle className="w-5 h-5" />
              No conectado: {health?.error ?? 'Error desconocido'}
              {health?.code && <span className="text-xs text-muted-foreground ml-2">(código {health.code})</span>}
            </div>
          )}
        </Card>

        {/* Stats */}
        <Card>
          <h2 className="font-semibold text-lg mb-4">Estadísticas</h2>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin w-4 h-4" /> Cargando...</div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 text-sm">
              <li><b>Conversaciones activas:</b> {stats?.activeConversations ?? 0}</li>
              <li><b>Conversaciones pendientes:</b> {stats?.pendingConversations ?? 0}</li>
              <li><b>Conversaciones hoy:</b> {stats?.todayConversations ?? 0}</li>
              <li><b>Mensajes hoy:</b> {stats?.todayMessages ?? 0}</li>
              <li><b>Tasa de conversión:</b> {stats?.conversionRate ?? 0}%</li>
              <li><b>Resp. promedio:</b> {stats?.avgResponseTime ?? '-'}</li>
            </ul>
          )}
        </Card>

        {/* Chats */}
        <Card>
          <h2 className="font-semibold text-lg mb-4">Chats iniciados</h2>
          {convLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin w-4 h-4" /> Cargando...</div>
          ) : conversations && conversations.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {conversations.map((conv: any) => (
                <li key={conv.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{conv.customerName || conv.instagramUserId}</span>
                    <span className="text-xs text-muted-foreground ml-2">({conv.instagramUserId})</span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{conv.status}</div>
                    <div>{formatChileDateTime(conv.lastMessageAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No hay chats iniciados aún.</p>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
