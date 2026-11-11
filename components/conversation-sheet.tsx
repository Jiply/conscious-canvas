'use client';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { getProfilePicture } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { Id } from '@/convex/_generated/dataModel';
import { Sheet, SheetTitle, SheetHeader, SheetContent, SheetDescription } from '@/components/ui/sheet';

export function ConversationSheet({
  agentId,
  open,
  onOpenChange,
}: {
  open: boolean;
  agentId: Id<'agents'> | null;
  onOpenChange: (open: boolean) => void;
}) {
  const agent = useQuery(api.agents.getAgent, agentId ? { agentId } : 'skip');
  const conversation = useQuery(api.conversationsMutations.getAgentActiveConversation, agentId ? { agentId } : 'skip');

  const messages = useQuery(
    api.conversationsMutations.getConversationMessages,
    conversation?._id ? { conversationId: conversation._id } : 'skip'
  );

  const otherParticipantId = conversation?.participantIds.find(id => id !== agentId);
  const otherParticipant = useQuery(api.agents.getAgent, otherParticipantId ? { agentId: otherParticipantId } : 'skip');
  const decisions = useQuery(api.decisions.getDecisionHistory, agentId ? { agentId, limit: 20 } : 'skip');
  const utterances = decisions?.filter(d => d.utterance) || [];

  if (!agent)
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[500px] p-8 sm:w-[600px]">
          <SheetHeader>
            <SheetTitle>Agent Details</SheetTitle>
            <SheetDescription>Loading agent information...</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-[500px] flex-col p-8 sm:w-full sm:max-w-2/5">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <img
              src={getProfilePicture(agent.name)}
              alt={agent.name}
              className="h-12 w-12 rounded-full border-2 border-border object-cover"
            />
            {agent.name}
          </SheetTitle>
          <SheetDescription className="text-base">
            {agent.role} • {agent.state || 'Idle'}
          </SheetDescription>
        </SheetHeader>
        <div className="grow">
          <div className="h-0 min-h-full space-y-6 overflow-y-auto">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mood:</span>
                  <Badge variant={agent.emotions.valence > 0 ? 'default' : 'secondary'}>
                    {agent.emotions.valence > 0.3 ? 'Happy' : agent.emotions.valence > -0.3 ? 'Neutral' : 'Unhappy'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Energy:</span>
                  <Badge variant={agent.emotions.arousal > 0.5 ? 'default' : 'secondary'}>
                    {agent.emotions.arousal > 0.7 ? 'Energetic' : agent.emotions.arousal > 0.3 ? 'Alert' : 'Calm'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Position:</span>
                  <span className="font-mono text-xs">
                    ({agent.pos.x.toFixed(1)}, {agent.pos.y.toFixed(1)})
                  </span>
                </div>
              </div>
            </div>

            <Separator />
            <div>
              <h3 className="mb-3 text-sm font-semibold">Needs</h3>
              <div className="space-y-2">
                {Object.entries(agent.needs).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span
                        className={value > 0.7 ? 'font-medium text-orange-500' : value > 0.9 ? 'font-bold text-red-500' : ''}
                      >
                        {(value * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={value * 100}
                      aria-label={key.replace(/([A-Z])/g, ' $1').trim()}
                      className="bg-secondary"
                      indicatorClassName={value > 0.9 ? 'bg-red-500' : value > 0.7 ? 'bg-orange-500' : 'bg-primary'}
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />
            {conversation ? (
              <div>
                <h3 className="mb-3 text-sm font-semibold">Conversation with {otherParticipant?.name || 'Unknown'}</h3>
                <div className="h-[300px] overflow-y-auto pr-4">
                  <div className="space-y-3">
                    {messages?.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">Conversation just started...</p>
                    )}
                    {messages?.map(msg => {
                      const isCurrentAgent = msg.agentId === agentId;
                      const speaker = isCurrentAgent ? agent : otherParticipant;

                      return (
                        <div key={msg._id} className={`flex gap-2 ${isCurrentAgent ? 'flex-row' : 'flex-row-reverse'}`}>
                          <div className="flex-shrink-0">
                            {speaker?.profilePicture && (
                              <img
                                src={speaker.profilePicture}
                                alt={speaker.name}
                                className="h-8 w-8 rounded-full border border-border object-cover"
                              />
                            )}
                          </div>
                          <div
                            className={`flex-1 rounded-lg p-3 ${
                              isCurrentAgent ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                            }`}
                          >
                            <p className="mb-1 text-xs font-semibold">{speaker?.name || 'Unknown'}</p>
                            <p className="text-sm">{msg.content}</p>
                            {msg.emotionSnapshot && (
                              <p className="mt-1 text-xs opacity-70">
                                {msg.emotionSnapshot.valence > 0 ? '😊' : msg.emotionSnapshot.valence < -0.3 ? '😟' : '😐'}
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
                  {conversation.turnCount !== 1 ? 's' : ''} exchanged
                  {conversation.status === 'active' && ' • Ongoing'}
                  {conversation.status === 'completed' && ' • Ended'}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="mb-3 text-sm font-semibold">Conversation</h3>
                <p className="text-sm text-muted-foreground italic">Not currently in a conversation</p>
              </div>
            )}

            <Separator />
            <div>
              <h3 className="mb-3 text-sm font-semibold">Recent Utterances</h3>
              {utterances.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No utterances recorded yet</p>
              ) : (
                <div className="max-h-[250px] space-y-2 overflow-y-auto pr-2">
                  {utterances.map(decision => (
                    <div key={decision._id} className="rounded-lg border border-border bg-secondary p-3">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <Badge variant="outline" className="text-xs">
                          {decision.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(decision._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm">{decision.utterance}</p>
                      {decision.innerThought && (
                        <p className="mt-1 text-xs text-muted-foreground italic">💭 {decision.innerThought}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />
            {agent.personality && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Personality</h3>
                <p className="text-sm text-muted-foreground">{agent.personality}</p>
              </div>
            )}
            {agent.goals && agent.goals.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Goals</h3>
                <div className="space-y-1">
                  {agent.goals
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 5)
                    .map((goal, idx) => (
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
