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
  SidebarSeparator,
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
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Clock,
  Eye,
  PlayCircle,
  PauseCircle,
  Search,
  User,
  Activity,
  Loader2,
} from "lucide-react";
import { useMemo } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PixiMap } from "@/components/PixiMap";
import { EventFeed } from "@/components/EventFeed";
import { ConversationSheet } from "@/components/ConversationSheet";
import { useHeartbeat } from "@/hooks/use-heartbeat";
import { useQuery, useMutation } from "convex/react";

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
const getProfilePicture = (agentName: string): string => {
  return AGENT_PROFILE_PICTURES[agentName] || "/01.png"; // Default to 01.png
};

export default function SimPage() {
  const [isWorldReady, setIsWorldReady] = useState(false);
  const { isLeader, stats, startTime } = useHeartbeat();
  const agents = useQuery(api.agents.listAgents) ?? [];
  const places = useQuery(api.map.getPlaces) ?? [];
  const [elapsedTime, setElapsedTime] = useState("00:00:00");

  // Check if observers API exists (may not if schema hasn't deployed yet)
  const hasObserversAPI =
    "observers" in api && "getWorldState" in (api.observers as any);

  const worldState = hasObserversAPI
    ? useQuery((api as any).observers.getWorldState)
    : { isRunning: true, observerCount: 1, adminEnabled: true };

  // Use reactive observer count from worldState (updates in real-time for all clients)
  const observerCount = worldState?.observerCount ?? 1;

  const toggleAdmin = hasObserversAPI
    ? useMutation((api as any).observers.toggleAdmin)
    : async () => {};
  const [searchQuery, setSearchQuery] = useState("");
  const [centerOnPlace, setCenterOnPlace] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"agents"> | null>(
    null
  );
  const [isConversationSheetOpen, setIsConversationSheetOpen] = useState(false);

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
    setSelectedAgentId(agentId);
    setIsConversationSheetOpen(true);
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
          <SidebarHeader className="border-b space-y-1">
            <div className="flex items-center justify-between px-2 pt-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold whitespace-nowrap">
                  Conscious Campus
                </h2>
              </div>
            </div>
            <div className="px-2 pb-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">
                  World:
                </span>
                {!isWorldReady ? (
                  <Badge
                    variant="outline"
                    className="gap-1.5 whitespace-nowrap"
                  >
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading
                  </Badge>
                ) : isLeader ? (
                  <Badge
                    variant="secondary"
                    className="gap-1.5 whitespace-nowrap"
                  >
                    <PlayCircle className="h-3 w-3" />
                    Running
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1.5 whitespace-nowrap"
                  >
                    <PauseCircle className="h-3 w-3" />
                    Paused
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 flex-shrink-0" />
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
                <Activity className="h-4 w-4 flex-shrink-0" />
                <span className="text-muted-foreground whitespace-nowrap">
                  {isLeader ? "Leader" : "Follower"}
                </span>
                {stats && (
                  <Badge
                    variant="outline"
                    className="text-xs font-mono whitespace-nowrap"
                  >
                    {stats.latencyMs}ms
                  </Badge>
                )}
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="flex flex-col divide-y">
            {/* Fixed Search Section */}
            <SidebarGroup className="flex-shrink-0">
              <SidebarGroupLabel className="px-2">
                Search Agents
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by name, role, state..."
                    className="pl-9 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
            {/* Scrollable Agents List */}
            <div className="flex-1 overflow-y-auto pb-2">
              <SidebarGroup>
                <SidebarGroupLabel className="px-2">
                  <div className="flex items-center justify-between w-full">
                    <span>Agents</span>
                    <Badge
                      variant="secondary"
                      className="ml-auto font-mono text-xs whitespace-nowrap"
                    >
                      {filteredAgents.length}/{agents.length}
                    </Badge>
                  </div>
                </SidebarGroupLabel>
                <SidebarGroupContent className="px-2">
                  {filteredAgents.length === 0 ? (
                    <div className="px-4 py-4 text-center text-sm text-muted-foreground leading-relaxed">
                      {agents.length === 0
                        ? "No agents yet. They will appear here when the simulation starts."
                        : "No agents match your search."}
                    </div>
                  ) : (
                    <TooltipProvider>
                      <SidebarMenu>
                        {filteredAgents.map((agent) => (
                          <SidebarMenuItem key={agent._id}>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <SidebarMenuButton className="h-auto py-1.5 px-2.5">
                                  <User className="h-4 w-4 flex-shrink-0" />
                                  <div className="flex flex-col items-start min-w-0 flex-1">
                                    <span className="text-sm font-medium truncate w-full">
                                      {agent.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate w-full">
                                      {agent.state} • {agent.role}
                                    </span>
                                  </div>
                                </SidebarMenuButton>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-xs p-4"
                                sideOffset={8}
                              >
                                <div className="space-y-3">
                                  <div className="flex justify-center pb-2">
                                    <img
                                      src={getProfilePicture(agent.name)}
                                      alt={agent.name}
                                      className="w-20 h-20 rounded-full object-cover border-2 border-border"
                                    />
                                  </div>
                                  <div className="pb-2 border-b">
                                    <p className="font-semibold text-sm">
                                      {agent.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {agent.role}
                                    </p>
                                  </div>
                                  {agent.personality && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium">
                                        Personality
                                      </p>
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        {agent.personality}
                                      </p>
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium">
                                      Position
                                    </p>
                                    <p className="text-xs text-muted-foreground font-mono">
                                      ({agent.pos.x}, {agent.pos.y})
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium">State</p>
                                    <p className="text-xs text-muted-foreground">
                                      {agent.state}
                                    </p>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-medium">
                                      Emotions
                                    </p>
                                    <div className="flex gap-3 text-xs flex-wrap">
                                      <span className="whitespace-nowrap">
                                        Mood:{" "}
                                        {agent.emotions.valence > 0
                                          ? "😊"
                                          : "😔"}{" "}
                                        {agent.emotions.valence.toFixed(2)}
                                      </span>
                                      <span className="whitespace-nowrap">
                                        Energy: ⚡{" "}
                                        {agent.emotions.arousal.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-medium">Needs</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <span className="whitespace-nowrap">
                                        😴{" "}
                                        {(agent.needs.sleepiness * 100).toFixed(
                                          0
                                        )}
                                        %
                                      </span>
                                      <span className="whitespace-nowrap">
                                        🍔{" "}
                                        {(agent.needs.hunger * 100).toFixed(0)}%
                                      </span>
                                      <span className="whitespace-nowrap">
                                        📚{" "}
                                        {(
                                          agent.needs.studyPressure * 100
                                        ).toFixed(0)}
                                        %
                                      </span>
                                      <span className="whitespace-nowrap">
                                        👥{" "}
                                        {(
                                          agent.needs.socialDrive * 100
                                        ).toFixed(0)}
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
              </SidebarGroup>
            </div>

            {/* Scrollable Places List */}
            <div className="flex-1 overflow-y-auto pb-2">
              <SidebarGroup>
                <SidebarGroupLabel className="px-2">Places</SidebarGroupLabel>
                <SidebarGroupContent className="px-2">
                  <SidebarMenu>
                    {mainPlaces.map((place) => (
                      <SidebarMenuItem key={place._id}>
                        <SidebarMenuButton
                          onClick={() => handleCenterOnPlace(place)}
                          className="cursor-pointer"
                        >
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{place.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t">
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="flex flex-col gap-2 px-2 py-2">
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
                        <PauseCircle className="h-4 w-4" />
                        Freeze Universe
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4" />
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
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">Campus Simulation</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs font-mono">{elapsedTime}</span>
              </Badge>
            </div>
          </header>

          <main className="flex-1 overflow-hidden bg-muted/20 p-6 flex gap-6">
            <div className="flex-1 rounded-lg border border-dashed border-border overflow-hidden">
              <PixiMap
                onWorldReady={setIsWorldReady}
                centerOnLocation={centerOnPlace}
                onCenterComplete={() => setCenterOnPlace(null)}
                isWorldRunning={observerCount > 0}
                observerCount={observerCount}
                onAgentClick={handleAgentClick}
              />
            </div>

            {/* Right sidebar for Event Feed */}
            <div className="w-80 flex-shrink-0 rounded-lg border border-border bg-background overflow-hidden flex flex-col">
              <EventFeed />
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Conversation Sheet */}
      <ConversationSheet
        agentId={selectedAgentId}
        open={isConversationSheetOpen}
        onOpenChange={setIsConversationSheetOpen}
      />
    </SidebarProvider>
  );
}
