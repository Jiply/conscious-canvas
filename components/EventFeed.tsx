"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

export function EventFeed() {
  const conversations = useQuery(
    api.conversationsMutations.getRecentConversations,
    { limit: 15 }
  );

  const getStatusColor = (status: "active" | "completed") => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "completed":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 1000) return "just now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h3 className="text-sm font-semibold">Recent Conversations</h3>
        <Badge variant="outline" className="font-mono text-xs">
          {conversations?.length ?? 0}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1.5">
          {!conversations || conversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No conversations yet. Start the simulation to see activity.
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation._id}
                className="p-2.5 rounded-md border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`p-1.5 rounded-md border ${getStatusColor(conversation.status)}`}
                  >
                    <MessageCircle className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed break-words">
                      {conversation.participantNames.join(" & ")}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTimestamp(conversation.startedAt)}
                      </span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                        {conversation.status}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">
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
    </div>
  );
}
