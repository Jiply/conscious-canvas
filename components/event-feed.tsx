'use client';
import { useQuery } from 'convex/react';
import { MessageCircle } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { Badge } from '@/components/ui/badge';

const getStatusColor = (status: 'active' | 'completed') =>
  status === 'active'
    ? 'bg-green-500/10 text-green-500 border-green-500/20'
    : 'bg-gray-500/10 text-gray-500 border-gray-500/20';

const formatTimestamp = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
};

export function EventFeed() {
  const conversations = useQuery(api.conversationsMutations.getRecentConversations, { limit: 15 });

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-sm font-semibold">Recent Conversations</h3>
        <Badge variant="outline" className="font-mono text-xs">
          {conversations?.length ?? 0}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1.5 p-2">
          {!conversations || conversations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No conversations yet. Start the simulation to see activity.
            </div>
          ) : (
            conversations.map(conversation => (
              <div key={conversation._id} className="rounded-md border bg-card p-2.5 transition-colors hover:bg-accent/50">
                <div className="flex items-start gap-2">
                  <div className={`rounded-md border p-1.5 ${getStatusColor(conversation.status)}`}>
                    <MessageCircle className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed break-words">{conversation.participantNames.join(' & ')}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{formatTimestamp(conversation.startedAt)}</span>
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        {conversation.status}
                      </Badge>
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        {conversation.turnCount} turns
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
