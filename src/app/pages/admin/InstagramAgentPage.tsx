import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/design-system/Card';
import { ConversationList } from '../../components/instagram/ConversationList';
import { ChatInterface } from '../../components/instagram/ChatInterface';
import { ProductQuickInsert } from '../../components/instagram/ProductQuickInsert';
import { useInstagramConversations, useProducts, useMutation } from '../../hooks/useData';
import { instagramAPI } from '../../lib/api';

export default function InstagramAgentPage() {
  const { data: conversations, isLoading: conversationsLoading, refetch } = useInstagramConversations();
  const { data: products, isLoading: productsLoading } = useProducts();
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
      await sendMessage.mutateAsync({ conversationId: selectedConversationId, content });
      const updated = await instagramAPI.getMessages(selectedConversationId);
      setMessages(updated);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTakeOver = async () => {
    if (!selectedConversationId) return;
    try {
      await takeOver.mutateAsync(selectedConversationId);
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
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 dark:text-gray-100 mb-2">Instagram Sales Agent</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Monitor AI agent conversations and take over when needed
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <div className="mb-4">
            <h2 className="text-lg text-gray-900 dark:text-gray-100">Conversations</h2>
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
              handleSendMessage(`Check out our ${product.name}! Price: $${product.price.toFixed(2)}. ${product.stock > 0 ? `We have ${product.stock} in stock.` : 'Currently out of stock.'}`);
            }}
          />

          <Card className="mt-6">
            <h3 className="text-sm text-gray-900 dark:text-gray-100 mb-3">
              AI Agent Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Active</span>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Response Time
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100">~2s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Today's Conversations
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Conversion Rate
                </span>
                <span className="text-sm text-gray-900 dark:text-gray-100">34%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
