"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/**
 * Map agent names to profile picture assets in /public folder
 */
const AGENT_PROFILE_PICTURES: Record<string, string> = {
  "Maya Chen": "/01.png",
  "Prof. James Wilson": "/02.png",
  "Zara Ahmed": "/03.png",
  "Liam O'Brien": "/04.png",
  "Sofia Martinez": "/05.png",
  "Raj Patel": "/06.png",
  "Emma Kim": "/07.png",
  "Marcus Johnson": "/08.png",
};

/**
 * Get profile picture URL for an agent
 */
const getProfilePicture = (agentName: string): string => {
  return AGENT_PROFILE_PICTURES[agentName] || "/01.png"; // Default to 01.png
};

interface ConversationSheetProps {
  agentId: Id<"agents"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConversationSheet({
  agentId,
  open,
  onOpenChange,
}: ConversationSheetProps) {
  // Get agent data
  const agent = useQuery(api.agents.getAgent, agentId ? { agentId } : "skip");

  // Get active conversation for this agent
  const conversation = useQuery(
    api.conversationsMutations.getAgentActiveConversation,
    agentId ? { agentId } : "skip"
  );

  // Get conversation messages
  const messages = useQuery(
    api.conversationsMutations.getConversationMessages,
    conversation?._id ? { conversationId: conversation._id } : "skip"
  );

  // Get other participant
  const otherParticipantId = conversation?.participantIds.find(
    (id) => id !== agentId
  );
  const otherParticipant = useQuery(
    api.agents.getAgent,
    otherParticipantId ? { agentId: otherParticipantId } : "skip"
  );

  // Get agent's utterance history
  const decisions = useQuery(
    api.decisions.getDecisionHistory,
    agentId ? { agentId, limit: 20 } : "skip"
  );

  // Filter decisions to only those with utterances
  const utterances = decisions?.filter((d) => d.utterance) || [];

  if (!agent) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[500px] sm:w-[600px] p-8">
          <SheetHeader>
            <SheetTitle>Agent Details</SheetTitle>
            <SheetDescription>Loading agent information...</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[500px] sm:w-full sm:max-w-2/5 p-8 flex flex-col"
      >
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <img
              src={getProfilePicture(agent.name)}
              alt={agent.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-border"
            />
            {agent.name}
          </SheetTitle>
          <SheetDescription className="text-base">
            {agent.role} • {agent.state || "Idle"}
          </SheetDescription>
        </SheetHeader>
        <div className="grow">
          <div className="h-0 min-h-full overflow-y-auto space-y-6">
            {/* Agent Stats */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mood:</span>
                  <Badge
                    variant={
                      agent.emotions.valence > 0 ? "default" : "secondary"
                    }
                  >
                    {agent.emotions.valence > 0.3
                      ? "Happy"
                      : agent.emotions.valence > -0.3
                        ? "Neutral"
                        : "Unhappy"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Energy:</span>
                  <Badge
                    variant={
                      agent.emotions.arousal > 0.5 ? "default" : "secondary"
                    }
                  >
                    {agent.emotions.arousal > 0.7
                      ? "Energetic"
                      : agent.emotions.arousal > 0.3
                        ? "Alert"
                        : "Calm"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Position:</span>
                  <span className="text-xs font-mono">
                    ({agent.pos.x.toFixed(1)}, {agent.pos.y.toFixed(1)})
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Needs */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Needs</h3>
              <div className="space-y-2">
                {Object.entries(agent.needs).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}:
                      </span>
                      <span
                        className={
                          value > 0.7
                            ? "text-orange-500 font-medium"
                            : value > 0.9
                              ? "text-red-500 font-bold"
                              : ""
                        }
                      >
                        {(value * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          value > 0.9
                            ? "bg-red-500"
                            : value > 0.7
                              ? "bg-orange-500"
                              : "bg-primary"
                        }`}
                        style={{ width: `${value * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Conversation */}
            {conversation ? (
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Conversation with {otherParticipant?.name || "Unknown"}
                </h3>
                <div className="h-[300px] overflow-y-auto pr-4">
                  <div className="space-y-3">
                    {messages?.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">
                        Conversation just started...
                      </p>
                    )}
                    {messages?.map((msg) => {
                      const isCurrentAgent = msg.agentId === agentId;
                      const speaker = isCurrentAgent ? agent : otherParticipant;

                      return (
                        <div
                          key={msg._id}
                          className={`flex gap-2 ${isCurrentAgent ? "flex-row" : "flex-row-reverse"}`}
                        >
                          <div className="flex-shrink-0">
                            {speaker?.profilePicture && (
                              <img
                                src={speaker.profilePicture}
                                alt={speaker.name}
                                className="w-8 h-8 rounded-full object-cover border border-border"
                              />
                            )}
                          </div>
                          <div
                            className={`flex-1 rounded-lg p-3 ${
                              isCurrentAgent
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary"
                            }`}
                          >
                            <p className="text-xs font-semibold mb-1">
                              {speaker?.name || "Unknown"}
                            </p>
                            <p className="text-sm">{msg.content}</p>
                            {msg.emotionSnapshot && (
                              <p className="text-xs opacity-70 mt-1">
                                {msg.emotionSnapshot.valence > 0
                                  ? "😊"
                                  : msg.emotionSnapshot.valence < -0.3
                                    ? "😟"
                                    : "😐"}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {conversation.turnCount} message
                  {conversation.turnCount !== 1 ? "s" : ""} exchanged
                  {conversation.status === "active" && " • Ongoing"}
                  {conversation.status === "completed" && " • Ended"}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold mb-3">Conversation</h3>
                <p className="text-sm text-muted-foreground italic">
                  Not currently in a conversation
                </p>
              </div>
            )}

            <Separator />

            {/* Utterances */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Recent Utterances</h3>
              {utterances.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No utterances recorded yet
                </p>
              ) : (
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                  {utterances.map((decision) => (
                    <div
                      key={decision._id}
                      className="rounded-lg bg-secondary p-3 border border-border"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {decision.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(decision._creationTime).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                      <p className="text-sm">{decision.utterance}</p>
                      {decision.innerThought && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          💭 {decision.innerThought}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Personality */}
            {agent.personality && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Personality</h3>
                <p className="text-sm text-muted-foreground">
                  {agent.personality}
                </p>
              </div>
            )}

            {/* Goals */}
            {agent.goals && agent.goals.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Goals</h3>
                <div className="space-y-1">
                  {agent.goals
                    .sort((a: any, b: any) => b.weight - a.weight)
                    .slice(0, 5)
                    .map((goal: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{goal.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(goal.weight * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
