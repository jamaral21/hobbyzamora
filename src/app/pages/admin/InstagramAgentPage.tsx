import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/design-system/Card';
import { ConversationList } from '../../components/instagram/ConversationList';
import { ChatInterface } from '../../components/instagram/ChatInterface';
import { ProductQuickInsert } from '../../components/instagram/ProductQuickInsert';
import { useInstagramConversations, useProducts, useMutation } from '../../hooks/useData';
import { instagramAPI } from '../../lib/api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export default function InstagramAgentPage() {
  const { isAuthenticated } = useAdminAuth();
  const { data: conversations, isLoading: conversationsLoading, refetch } = useInstagramConversations(undefined, { enabled: isAuthenticated });
  const { data: products, isLoading: productsLoading } = useProducts(undefined, { enabled: isAuthenticated });
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  
  const sendMessage = useMutation(instagramAPI.sendMessage);
  const takeOver = useMutation(instagramAPI.takeOver);

  // Set first conversation as selected when loaded
  if (!selectedConversationId && conversations?.length > 0) {
    setSelectedConversationId(conversations[0].id);
  }

  // Load messages when conversation changes
  const loadMessages = async (convId: string) => {
    setSelectedConversationId(convId);
    try {
      const data = await instagramAPI.getMessages(convId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversationId) return;
    try {
      await sendMessage.mutate({ conversationId: selectedConversationId, content });
      const updated = await instagramAPI.getMessages(selectedConversationId);
      setMessages(updated);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTakeOver = async () => {
    if (!selectedConversationId) return;
    try {
      await takeOver.mutate(selectedConversationId);
      refetch();
    } catch (error) {
      console.error('Failed to take over:', error);
    }
  };

  const selectedConversation = (conversations || []).find(
    (c: any) => c.id === selectedConversationId
  );

  if (conversationsLoading || productsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Agente de Instagram</h1>
        <p className="text-muted-foreground">
          Monitorea conversaciones del agente IA y toma el control cuando sea necesario
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <div className="mb-4">
            <h2 className="text-lg text-foreground">Conversaciones</h2>
          </div>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            <ConversationList
              conversations={conversations || []}
              selectedId={selectedConversationId || ''}
              onSelect={loadMessages}
            />
          </div>
        </Card>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          {selectedConversation && (
            <ChatInterface
              conversationId={selectedConversationId!}
              customerName={selectedConversation.customerName}
              messages={messages.map((m: any) => ({
                id: m.id,
                sender: m.sender.toLowerCase() as 'customer' | 'bot' | 'human',
                content: m.content,
                timestamp: m.createdAt,
              }))}
              onSendMessage={handleSendMessage}
              onTakeOver={handleTakeOver}
            />
          )}
        </div>

        {/* Product Quick Insert */}
        <div className="lg:col-span-1">
          <ProductQuickInsert
            products={products || []}
            onInsert={(product) => {
              const msg = product.stock > 0
                ? `Mira nuestro ${product.name}! Precio: $${product.price.toFixed(2)}. Tenemos ${product.stock} en stock.`
                : `Mira nuestro ${product.name}! Precio: $${product.price.toFixed(2)}. Actualmente agotado.`;
              handleSendMessage(msg);
            }}
          />

          <Card className="mt-6">
            <h3 className="text-sm text-foreground mb-3">
              Estado del Agente IA
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Activo</span>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Tiempo de Respuesta
                </span>
                <span className="text-sm text-foreground">~2s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Conversaciones Hoy
                </span>
                <span className="text-sm text-foreground">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Tasa de Conversión
                </span>
                <span className="text-sm text-foreground">34%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
