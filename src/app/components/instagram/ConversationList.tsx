import { clsx } from 'clsx';
import { InstagramConversation } from '../../data/mockData';
import { Badge } from '../design-system/Badge';
import { formatDistanceToNow } from 'date-fns';

export interface ConversationListProps {
  conversations: InstagramConversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  return (
    <div className="space-y-1">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelect(conversation.id)}
          className={clsx(
            'w-full p-4 rounded-lg text-left transition-all',
            selectedId === conversation.id
              ? 'bg-primary/10 border border-primary'
              : 'hover:bg-secondary border border-transparent'
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="text-sm text-foreground mb-1">
                {conversation.customer}
              </h4>
              <p className="text-xs text-muted-foreground">
                @{conversation.username}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(conversation.timestamp), { addSuffix: true })}
              </span>
              {conversation.unread && (
                <div className="w-2 h-2 bg-primary rounded-full" />
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {conversation.lastMessage}
          </p>
          <div className="mt-2">
            {conversation.status === 'active' && <Badge variant="success" size="sm">Activa</Badge>}
            {conversation.status === 'pending' && <Badge variant="warning" size="sm">Pendiente</Badge>}
            {conversation.status === 'resolved' && <Badge variant="default" size="sm">Resuelta</Badge>}
          </div>
        </button>
      ))}
    </div>
  );
}
