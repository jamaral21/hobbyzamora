import { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Card } from '../../components/design-system/Card';
import { ConversationList } from '../../components/instagram/ConversationList';
import { ChatInterface } from '../../components/instagram/ChatInterface';
import { ProductQuickInsert } from '../../components/instagram/ProductQuickInsert';
import { mockConversations, mockProducts } from '../../data/mockData';

export default function InstagramAgentPage() {
  const [selectedConversationId, setSelectedConversationId] = useState(mockConversations[0].id);

  // Mock messages for the selected conversation
  const mockMessages = [
    {
      id: '1',
      sender: 'customer' as const,
      content: 'Hi! Do you have the watercolor set in stock?',
      timestamp: '2026-03-10T11:40:00Z',
    },
    {
      id: '2',
      sender: 'bot' as const,
      content: 'Hello! Yes, we have the Premium Watercolor Set in stock. It\'s available in 12, 24, and 36 color options. Would you like to know more details?',
      timestamp: '2026-03-10T11:41:00Z',
    },
    {
      id: '3',
      sender: 'customer' as const,
      content: 'Yes, how much is the 24 color set?',
      timestamp: '2026-03-10T11:43:00Z',
    },
    {
      id: '4',
      sender: 'bot' as const,
      content: 'The 24 color Premium Watercolor Set is $49.99. It includes professional grade paints with vibrant pigments. We currently have 45 in stock.',
      timestamp: '2026-03-10T11:44:00Z',
    },
  ];

  const selectedConversation = mockConversations.find(
    (c) => c.id === selectedConversationId
  );

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
              conversations={mockConversations}
              selectedId={selectedConversationId}
              onSelect={setSelectedConversationId}
            />
          </div>
        </Card>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          {selectedConversation && (
            <ChatInterface
              conversationId={selectedConversationId}
              customerName={selectedConversation.customer}
              messages={mockMessages}
              onSendMessage={(message) => console.log('Send:', message)}
              onTakeOver={() => console.log('Take over conversation')}
            />
          )}
        </div>

        {/* Product Quick Insert */}
        <div className="lg:col-span-1">
          <ProductQuickInsert
            products={mockProducts}
            onInsert={(product) => console.log('Insert product:', product)}
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
