import { Send, User } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { useState } from 'react';

interface Message {
  id: string;
  sender: 'customer' | 'agent' | 'bot';
  content: string;
  timestamp: string;
}

export interface ChatInterfaceProps {
  conversationId: string;
  customerName: string;
  messages: Message[];
  onSendMessage: (message: string) => void;
  onTakeOver: () => void;
}

export function ChatInterface({
  customerName,
  messages,
  onSendMessage,
  onTakeOver,
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-gray-900 dark:text-gray-100">{customerName}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active conversation</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onTakeOver}>
          Take Over
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[70%] px-4 py-2 rounded-lg ${
                message.sender === 'customer'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : message.sender === 'bot'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                  : 'bg-purple-600 text-white'
              }`}
            >
              {message.sender === 'bot' && (
                <p className="text-xs mb-1 opacity-75">🤖 AI Agent</p>
              )}
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-75">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <Button onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
