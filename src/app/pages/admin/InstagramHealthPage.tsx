import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/design-system/Card';
import { useInstagramStats, useInstagramConversations } from '../../hooks/useData';
import { Loader2 } from 'lucide-react';

export default function InstagramHealthPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useInstagramStats();
  const { data: conversations, isLoading: convLoading, error: convError } = useInstagramConversations();

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto py-8 space-y-8">
        <Card>
          <h2 className="text-xl font-bold mb-2">Estado de conexión a Instagram</h2>
          {statsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" />Cargando...</div>
          ) : statsError ? (
            <div className="text-red-500">No conectado a Instagram</div>
          ) : (
            <ul className="grid grid-cols-2 gap-4">
              <li><b>Conversaciones activas:</b> {stats?.activeConversations}</li>
              <li><b>Conversaciones pendientes:</b> {stats?.pendingConversations}</li>
              <li><b>Conversaciones hoy:</b> {stats?.todayConversations}</li>
              <li><b>Mensajes hoy:</b> {stats?.todayMessages}</li>
              <li><b>Tasa de conversión:</b> {stats?.conversionRate}%</li>
              <li><b>Tiempo resp. promedio:</b> {stats?.avgResponseTime}</li>
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-bold mb-2">Chats iniciados</h2>
          {convLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin" />Cargando...</div>
          ) : convError ? (
            <div className="text-red-500">Error al cargar chats</div>
          ) : conversations && conversations.length > 0 ? (
            <ul className="divide-y divide-border">
              {conversations.map((conv: any) => (
                <li key={conv.id} className="py-2">
                  <b>{conv.customerName || conv.instagramUserId}</b> <span className="text-xs text-muted-foreground">({conv.status})</span>
                  <div className="text-xs text-muted-foreground">Último mensaje: {new Date(conv.lastMessageAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-muted-foreground">No hay chats iniciados.</div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
