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
              ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-600'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                {conversation.customer}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                @{conversation.username}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(conversation.timestamp), { addSuffix: true })}
              </span>
              {conversation.unread && (
                <div className="w-2 h-2 bg-purple-600 rounded-full" />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {conversation.lastMessage}
          </p>
          <div className="mt-2">
            {conversation.status === 'active' && <Badge variant="success" size="sm">Active</Badge>}
            {conversation.status === 'pending' && <Badge variant="warning" size="sm">Pending</Badge>}
            {conversation.status === 'resolved' && <Badge variant="default" size="sm">Resolved</Badge>}
          </div>
        </button>
      ))}
    </div>
  );
}
