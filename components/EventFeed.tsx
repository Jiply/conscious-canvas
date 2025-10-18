"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageCircle, Eye, Globe, Navigation } from "lucide-react";

export function EventFeed() {
  // Check if events API exists (may not if schema hasn't deployed yet)
  const hasEventsAPI =
    "events" in api && "getRecentEvents" in (api.events as any);

  const events = hasEventsAPI
    ? (useQuery((api as any).events.getRecentEvents, { limit: 15 }) ?? [])
    : [];

  const getEventIcon = (type: string) => {
    switch (type) {
      case "decision":
        return <Navigation className="h-3 w-3" />;
      case "conversation":
        return <MessageCircle className="h-3 w-3" />;
      case "observation":
        return <Eye className="h-3 w-3" />;
      case "world":
        return <Globe className="h-3 w-3" />;
      case "movement":
        return <Navigation className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "decision":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "conversation":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "observation":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "world":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "movement":
        return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
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
        <h3 className="text-sm font-semibold">Recent Events</h3>
        <Badge variant="outline" className="font-mono text-xs">
          {events.length}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1.5">
          {events.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No events yet. Start the simulation to see activity.
            </div>
          ) : (
            events.map((event: any) => (
              <div
                key={event._id}
                className="p-2.5 rounded-md border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`p-1.5 rounded-md border ${getEventColor(event.type)}`}
                  >
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed break-words">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTimestamp(event.timestamp)}
                      </span>
                      {event.metadata?.severity && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1"
                        >
                          {event.metadata.severity}
                        </Badge>
                      )}
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
