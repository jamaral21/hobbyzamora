import { Send, User } from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { useState } from 'react';
import { formatChileTime } from '../../lib/chileDate';

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
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-foreground">{customerName}</h3>
            <p className="text-xs text-muted-foreground">Conversación activa</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onTakeOver}>
          Tomar Control
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
                  ? 'bg-secondary text-foreground'
                  : message.sender === 'bot'
                  ? 'bg-accent/10 text-foreground'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {message.sender === 'bot' && (
                <p className="text-xs mb-1 opacity-75">🤖 Agente IA</p>
              )}
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-75">
                {formatChileTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button onClick={handleSend}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
