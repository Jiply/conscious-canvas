"use client";
import {
  Sidebar,
  SidebarMenu,
  SidebarRail,
  SidebarInset,
  SidebarGroup,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarContent,
  SidebarProvider,
  SidebarMenuItem,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
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
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PixiMap } from "@/components/PixiMap";
import { Button } from "@/components/ui/button";
import { EventFeed } from "@/components/EventFeed";
import { useHeartbeat } from "@/hooks/use-heartbeat";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { Separator } from "@/components/ui/separator";
import type { Id } from "@/convex/_generated/dataModel";
import { ConversationSheet } from "@/components/ConversationSheet";

/**
 * Map agent names to profile picture assets in /public folder
 * Only use the actual PNG files that exist: 01.png through 10.png
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
function getProfilePicture(agentName: string) {
  return AGENT_PROFILE_PICTURES[agentName] || `/01.png`; // Default to 01.png
}

export default function SimPage() {
  const [searchQuery, setSearchQuery] = useState(``);
  const { isLeader, stats, startTime } = useHeartbeat();
  const [elapsedTime, setElapsedTime] = useState(`00:00:00`);
  const [isWorldReady, setIsWorldReady] = useState<boolean>(false);
  const [isConvoSheetOpen, setIsConvoSheetOpen] = useState<boolean>(false);
  const [chosenAgentId, setChosenAgentId] = useState<Id<`agents`> | null>(null);

  const places = useQuery(api.map.getPlaces) ?? [];
  const agents = useQuery(api.agents.listAgents) ?? [];

  // Check if observers API exists (may not if schema hasn't deployed yet)
  const hasObserversAPI =
    `observers` in api && `getWorldState` in api.observers;

  const worldState = hasObserversAPI
    ? useQuery(api.observers.getWorldState)
    : { isRunning: true, observerCount: 1, adminEnabled: true };

  // Use reactive observer count from worldState (updates in real-time for all clients)
  const observerCount = worldState?.observerCount ?? 1;

  const toggleAdmin = hasObserversAPI
    ? useMutation(api.observers.toggleAdmin)
    : async () => {};

  const [centerOnPlace, setCenterOnPlace] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;

    const query = searchQuery.toLowerCase();
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.role.toLowerCase().includes(query) ||
        agent.state.toLowerCase().includes(query) ||
        agent.personality?.toLowerCase().includes(query)
    );
  }, [agents, searchQuery]);

  // Filter places to show only main landmarks
  const mainPlaces = useMemo(() => {
    return places.filter(
      (place) =>
        !["dorm_room", "common_room", "study_room"].includes(place.kind)
    );
  }, [places]);

  // Handle centering camera on a place
  const handleCenterOnPlace = (place: (typeof places)[0]) => {
    // Calculate center of place bounds
    const centerX = place.bounds.x + place.bounds.width / 2;
    const centerY = place.bounds.y + place.bounds.height / 2;
    setCenterOnPlace({ x: centerX, y: centerY });
  };

  // Handle clicking on an agent
  const handleAgentClick = (agentId: Id<"agents">) => {
    setChosenAgentId(agentId);
    setIsConvoSheetOpen(true);
  };

  // Update elapsed time every second
  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      setElapsedTime(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
          <SidebarHeader>
            <h2 className="text-lg font-semibold whitespace-nowrap">
              Conscious Campus
            </h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <ClockIcon className="size-4 flex-shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">
                  World:
                </span>
                {!isWorldReady ? (
                  <Badge
                    variant="outline"
                    className="gap-1.5 whitespace-nowrap"
                  >
                    <Loader2Icon className="size-3 animate-spin" />
                    Loading
                  </Badge>
                ) : isLeader ? (
                  <Badge
                    variant="secondary"
                    className="gap-1.5 whitespace-nowrap"
                  >
                    <PlayCircleIcon className="size-3" />
                    Running
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1.5 whitespace-nowrap"
                  >
                    <PauseCircleIcon className="size-3" />
                    Paused
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <EyeIcon className="size-4 flex-shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">
                  Observers:
                </span>
                <Badge
                  className="text-xs font-mono whitespace-nowrap"
                  variant={observerCount > 0 ? "default" : "outline"}
                >
                  {observerCount}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ActivityIcon className="size-4 flex-shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">
                  {isLeader ? "Leader" : "Follower"}
                </span>
                {stats ? (
                  <Badge
                    variant="outline"
                    className="text-xs font-mono whitespace-nowrap"
                  >
                    {stats.latencyMs}ms
                  </Badge>
                ) : null}
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="flex-shrink-0 pb-4">
              <SidebarGroupLabel className="px-2">
                Search Agents
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQuery}
                    className="pl-9 h-9"
                    placeholder="Search by name, role, state..."
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="grow border-y">
              <SidebarGroup className="h-0 min-h-full pb-4">
                <SidebarGroupLabel>
                  <div className="flex items-center justify-between w-full">
                    Agents
                    <Badge
                      variant="secondary"
                      className="ml-auto font-mono text-xs whitespace-nowrap"
                    >
                      {filteredAgents.length}/{agents.length}
                    </Badge>
                  </div>
                </SidebarGroupLabel>
                <div className="grow overflow-y-auto px-2">
                  <SidebarGroupContent className="h-full">
                    {filteredAgents.length < 1 ? (
                      <div className="h-full p-4 flex flex-col justify-center items-center text-xs text-muted-foreground bg-muted rounded-md">
                        {agents.length < 1 ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          "No agents match your search."
                        )}
                      </div>
                    ) : (
                      <TooltipProvider>
                        <SidebarMenu>
                          {filteredAgents.map((a) => (
                            <SidebarMenuItem key={a._id}>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <SidebarMenuButton className="h-auto py-1 px-2">
                                    <UserIcon className="size-4 flex-shrink-0" />
                                    <div className="flex flex-col items-start min-w-0 flex-1">
                                      <span className="text-sm font-medium truncate w-full">
                                        {a.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground truncate w-full">
                                        {a.state} • {a.role}
                                      </span>
                                    </div>
                                  </SidebarMenuButton>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  sideOffset={8}
                                  className="max-w-xs p-4"
                                >
                                  <div className="space-y-3">
                                    <div className="flex justify-center pb-2">
                                      <img
                                        alt={a.name}
                                        src={getProfilePicture(a.name)}
                                        className="w-20 h-20 rounded-full object-cover border-2 border-border"
                                      />
                                    </div>
                                    <div className="pb-2 border-b">
                                      <p className="font-semibold text-sm">
                                        {a.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {a.role}
                                      </p>
                                    </div>
                                    {a.personality ? (
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium">
                                          Personality
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                          {a.personality}
                                        </p>
                                      </div>
                                    ) : null}
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium">
                                        Position
                                      </p>
                                      <p className="text-xs text-muted-foreground font-mono">
                                        ({a.pos.x}, {a.pos.y})
                                      </p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium">
                                        State
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {a.state}
                                      </p>
                                    </div>
                                    <div className="space-y-1.5">
                                      <p className="text-xs font-medium">
                                        Emotions
                                      </p>
                                      <div className="flex gap-3 text-xs flex-wrap">
                                        <span className="whitespace-nowrap">
                                          Mood:&nbsp;
                                          {a.emotions.valence > 0 ? "😊" : "😔"}
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
                                      <p className="text-xs font-medium">
                                        Needs
                                      </p>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <span className="whitespace-nowrap">
                                          😴&nbsp;
                                          {(a.needs.sleepiness * 100).toFixed(
                                            0
                                          )}
                                          %
                                        </span>
                                        <span className="whitespace-nowrap">
                                          🍔&nbsp;
                                          {(a.needs.hunger * 100).toFixed(0)}%
                                        </span>
                                        <span className="whitespace-nowrap">
                                          📚&nbsp;
                                          {(
                                            a.needs.studyPressure * 100
                                          ).toFixed(0)}
                                          %
                                        </span>
                                        <span className="whitespace-nowrap">
                                          👥&nbsp;
                                          {(a.needs.socialDrive * 100).toFixed(
                                            0
                                          )}
                                          %
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
                  {mainPlaces.map((place) => (
                    <SidebarMenuItem key={place._id}>
                      <SidebarMenuButton
                        className="cursor-pointer"
                        onClick={() => handleCenterOnPlace(place)}
                      >
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
                  <Button
                    variant={worldState?.adminEnabled ? "outline" : "default"}
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() =>
                      toggleAdmin({
                        enabled: !(worldState?.adminEnabled ?? true),
                      })
                    }
                  >
                    {worldState?.adminEnabled ? (
                      <>
                        <PauseCircleIcon className="h-4 w-4" />
                        Freeze Universe
                      </>
                    ) : (
                      <>
                        <PlayCircleIcon className="h-4 w-4" />
                        Unfreeze Universe
                      </>
                    )}
                  </Button>
                  <div className="text-xs text-muted-foreground px-2">
                    {worldState?.adminEnabled
                      ? "Admin: Simulation enabled"
                      : "Admin: Simulation disabled"}
                  </div>
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
                <span className="text-xs font-mono">{elapsedTime}</span>
              </Badge>
            </div>
          </header>
          <main className="flex-1 overflow-hidden bg-muted/20 p-6 flex gap-6">
            <div className="flex-1 rounded-lg border border-dashed border-border overflow-hidden">
              <PixiMap
                observerCount={observerCount}
                onWorldReady={setIsWorldReady}
                onAgentClick={handleAgentClick}
                centerOnLocation={centerOnPlace}
                isWorldRunning={observerCount > 0}
                onCenterComplete={() => setCenterOnPlace(null)}
              />
            </div>
            <div className="w-80 flex-shrink-0 rounded-lg border border-border bg-background overflow-hidden flex flex-col">
              <div className="flex flex-col h-full">
                <EventFeed />
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
      <ConversationSheet
        open={isConvoSheetOpen}
        agentId={chosenAgentId}
        onOpenChange={setIsConvoSheetOpen}
      />
    </SidebarProvider>
  );
}
