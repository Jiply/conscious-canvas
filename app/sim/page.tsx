'use client';
import { useQuery } from 'convex/react';
import { useMemo, useState } from 'react';
import { api } from '@/convex/_generated/api';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getProfilePicture } from '@/lib/utils';
import { PixiMap } from '@/components/pixi-map';
import { EventFeed } from '@/components/event-feed';
import { useHeartbeat } from '@/hooks/use-heartbeat';
import { Separator } from '@/components/ui/separator';
import type { Id } from '@/convex/_generated/dataModel';
import { ConversationSheet } from '@/components/conversation-sheet';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

import {
  EyeIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  SearchIcon,
  Loader2Icon,
  ActivityIcon,
  PlayCircleIcon,
  PauseCircleIcon,
} from 'lucide-react';

import {
  Sidebar,
  SidebarMenu,
  SidebarRail,
  SidebarGroup,
  SidebarInset,
  SidebarFooter,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarMenuItem,
  SidebarProvider,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarGroupContent,
} from '@/components/ui/sidebar';

export default function SimPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { isLeader, stats } = useHeartbeat();
  const [isWorldReady, setIsWorldReady] = useState(false);
  const [isConvoSheetOpen, setIsConvoSheetOpen] = useState(false);
  const [chosenAgentId, setChosenAgentId] = useState<Id<'agents'> | null>(null);
  const places = useQuery(api.map.getPlaces) ?? [];
  const agents = useQuery(api.agents.listAgents) ?? [];
  const [centerOnPlace, setCenterOnPlace] = useState<{ x: number; y: number } | null>(null);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const query = searchQuery.toLowerCase();

    return agents.filter(
      agent =>
        agent.name.toLowerCase().includes(query) ||
        agent.role.toLowerCase().includes(query) ||
        agent.state.toLowerCase().includes(query) ||
        agent.personality?.toLowerCase().includes(query)
    );
  }, [agents, searchQuery]);

  const mainPlaces = useMemo(
    () => places.filter(place => !['dorm_room', 'common_room', 'study_room'].includes(place.kind)),
    [places]
  );

  const handleCenterOnPlace = (place: (typeof places)[0]) =>
    setCenterOnPlace({ x: place.bounds.x + place.bounds.width / 2, y: place.bounds.y + place.bounds.height / 2 });

  const handleAgentClick = (agentId: Id<'agents'>) => {
    setChosenAgentId(agentId);
    setIsConvoSheetOpen(true);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <h2 className="text-lg font-semibold whitespace-nowrap">Conscious Campus</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <ClockIcon className="size-4 flex-shrink-0" />
                <span className="whitespace-nowrap text-muted-foreground">World:</span>
                {!isWorldReady ? (
                  <Badge variant="outline" className="gap-1.5 whitespace-nowrap">
                    <Loader2Icon className="size-3 animate-spin" />
                    Loading
                  </Badge>
                ) : isLeader ? (
                  <Badge variant="secondary" className="gap-1.5 whitespace-nowrap">
                    <PlayCircleIcon className="size-3" />
                    Running
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5 whitespace-nowrap">
                    <PauseCircleIcon className="size-3" />
                    Paused
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <EyeIcon className="size-4 flex-shrink-0" />
                <span className="whitespace-nowrap text-muted-foreground">Observers:</span>
                <Badge className="font-mono text-xs whitespace-nowrap" variant="default">
                  1
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ActivityIcon className="size-4 flex-shrink-0" />
                <span className="whitespace-nowrap text-muted-foreground">{isLeader ? 'Leader' : 'Follower'}</span>
                {stats ? (
                  <Badge variant="outline" className="font-mono text-xs whitespace-nowrap">
                    {stats.latencyMs}ms
                  </Badge>
                ) : null}
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="flex-shrink-0 pb-4">
              <SidebarGroupLabel className="px-2">Search Agents</SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    className="h-9 pl-9"
                    placeholder="Search by name, role, state..."
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="grow border-y">
              <SidebarGroup className="h-0 min-h-full pb-4">
                <SidebarGroupLabel>
                  <div className="flex w-full items-center justify-between">
                    Agents
                    <Badge variant="secondary" className="ml-auto font-mono text-xs whitespace-nowrap">
                      {filteredAgents.length}/{agents.length}
                    </Badge>
                  </div>
                </SidebarGroupLabel>
                <div className="grow overflow-y-auto px-2">
                  <SidebarGroupContent className="h-full">
                    {filteredAgents.length < 1 ? (
                      <div className="flex h-full flex-col items-center justify-center rounded-md bg-muted p-4 text-xs text-muted-foreground">
                        {agents.length < 1 ? <Loader2Icon className="size-4 animate-spin" /> : 'No agents match your search.'}
                      </div>
                    ) : (
                      <TooltipProvider>
                        <SidebarMenu>
                          {filteredAgents.map(a => (
                            <SidebarMenuItem key={a._id}>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <SidebarMenuButton className="h-auto px-2 py-1">
                                    <UserIcon className="size-4 flex-shrink-0" />
                                    <div className="flex min-w-0 flex-1 flex-col items-start">
                                      <span className="w-full truncate text-sm font-medium">{a.name}</span>
                                      <span className="w-full truncate text-xs text-muted-foreground">
                                        {a.state} • {a.role}
                                      </span>
                                    </div>
                                  </SidebarMenuButton>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8} className="max-w-xs p-4">
                                  <div className="space-y-3">
                                    <div className="flex justify-center pb-2">
                                      <img
                                        alt={a.name}
                                        src={getProfilePicture(a.name)}
                                        className="h-20 w-20 rounded-full border-2 border-border object-cover"
                                      />
                                    </div>
                                    <div className="border-b pb-2">
                                      <p className="text-sm font-semibold">{a.name}</p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">{a.role}</p>
                                    </div>
                                    {a.personality ? (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium">Personality</p>
                                        <p className="text-xs leading-relaxed text-muted-foreground">{a.personality}</p>
                                      </div>
                                    ) : null}
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium">Position</p>
                                      <p className="font-mono text-xs text-muted-foreground">
                                        ({a.pos.x}, {a.pos.y})
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium">State</p>
                                      <p className="text-xs text-muted-foreground">{a.state}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium">Emotions</p>
                                      <div className="flex flex-wrap gap-3 text-xs">
                                        <span className="whitespace-nowrap">
                                          Mood:&nbsp;
                                          {a.emotions.valence > 0 ? '😊' : '😔'}
                                          &nbsp;
                                          {a.emotions.valence.toFixed(2)}
                                        </span>
                                        <span className="whitespace-nowrap">
                                          Energy: ⚡&nbsp;
                                          {a.emotions.arousal.toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium">Needs</p>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <span className="whitespace-nowrap">
                                          😴&nbsp;
                                          {(a.needs.sleepiness * 100).toFixed(0)}%
                                        </span>
                                        <span className="whitespace-nowrap">
                                          🍔&nbsp;
                                          {(a.needs.hunger * 100).toFixed(0)}%
                                        </span>
                                        <span className="whitespace-nowrap">
                                          📚&nbsp;
                                          {(a.needs.studyPressure * 100).toFixed(0)}%
                                        </span>
                                        <span className="whitespace-nowrap">
                                          👥&nbsp;
                                          {(a.needs.socialDrive * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </TooltipProvider>
                    )}
                  </SidebarGroupContent>
                </div>
              </SidebarGroup>
            </div>
            <SidebarGroup className="h-52 pb-4">
              <SidebarGroupLabel>Places</SidebarGroupLabel>
              <SidebarGroupContent className="grow overflow-y-auto px-2">
                <SidebarMenu>
                  {mainPlaces.map(place => (
                    <SidebarMenuItem key={place._id}>
                      <SidebarMenuButton className="cursor-pointer" onClick={() => handleCenterOnPlace(place)}>
                        <MapPinIcon className="size-4 flex-shrink-0" />
                        <span className="truncate">{place.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="flex flex-col gap-2 p-2">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <PauseCircleIcon className="h-4 w-4" />
                    Freeze Universe
                  </Button>
                  <div className="px-2 text-xs text-muted-foreground">Admin: Simulation enabled</div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger />
            <Separator className="h-6" orientation="vertical" />
            <h1 className="text-lg font-semibold">Campus Simulation</h1>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <ClockIcon className="size-3" />
                <span className="font-mono text-xs">00:00:00</span>
              </Badge>
            </div>
          </header>
          <main className="flex flex-1 gap-6 overflow-hidden bg-muted/20 p-6">
            <div className="flex-1 overflow-hidden rounded-lg border border-dashed border-border">
              <PixiMap
                onWorldReady={setIsWorldReady}
                onAgentClick={handleAgentClick}
                centerOnLocation={centerOnPlace}
                onCenterComplete={() => setCenterOnPlace(null)}
              />
            </div>
            <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background">
              <div className="flex h-full flex-col">
                <EventFeed />
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
      <ConversationSheet open={isConvoSheetOpen} agentId={chosenAgentId} onOpenChange={setIsConvoSheetOpen} />
    </SidebarProvider>
  );
}
