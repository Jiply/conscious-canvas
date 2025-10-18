"use client";

import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { useHeartbeat } from "@/hooks/use-heartbeat";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PixiMap } from "@/components/PixiMap";
import { useMemo } from "react";

export default function SimPage() {
  const [isWorldReady, setIsWorldReady] = useState(false);
  const { isLeader, stats } = useHeartbeat();
  const agents = useQuery(api.agents.listAgents) ?? [];
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
          <SidebarHeader className="border-b">
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Conscious Campus</h2>
              </div>
            </div>
            <div className="px-2 py-1">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="text-muted-foreground">World: </span>
                {!isWorldReady ? (
                  <Badge variant="outline" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading
                  </Badge>
                ) : isLeader ? (
                  <Badge variant="secondary" className="gap-1">
                    <PlayCircle className="h-3 w-3" />
                    Running
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <PauseCircle className="h-3 w-3" />
                    Paused
                  </Badge>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4" />
                <span className="text-muted-foreground">
                  {isLeader ? "Leader" : "Follower"}
                </span>
                {stats && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {stats.latencyMs}ms
                  </Badge>
                )}
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Search Agents</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="relative px-2">
                  <Search className="absolute left-4 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, role, state..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel>
                <div className="flex items-center justify-between w-full">
                  <span>Agents</span>
                  <Badge variant="secondary" className="ml-auto">
                    {filteredAgents.length}/{agents.length}
                  </Badge>
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {filteredAgents.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    {agents.length === 0
                      ? "No agents yet. They will appear here when the simulation starts."
                      : "No agents match your search."}
                  </div>
                ) : (
                  <TooltipProvider>
                    <SidebarMenu>
                      {filteredAgents.map((agent) => (
                        <SidebarMenuItem key={agent._id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton>
                                <User className="h-4 w-4" />
                                <div className="flex flex-col items-start">
                                  <span className="text-sm font-medium">
                                    {agent.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {agent.state} • {agent.role}
                                  </span>
                                </div>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-2">
                                <div>
                                  <p className="font-semibold">{agent.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {agent.role}
                                  </p>
                                </div>
                                {agent.personality && (
                                  <div>
                                    <p className="text-xs font-medium">
                                      Personality:
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {agent.personality}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-medium">
                                    Position:
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    ({agent.pos.x}, {agent.pos.y})
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium">State:</p>
                                  <p className="text-xs text-muted-foreground">
                                    {agent.state}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium">
                                    Emotions:
                                  </p>
                                  <div className="flex gap-2 text-xs">
                                    <span>
                                      Mood:{" "}
                                      {agent.emotions.valence > 0 ? "😊" : "😔"}{" "}
                                      {agent.emotions.valence.toFixed(2)}
                                    </span>
                                    <span>
                                      Energy: ⚡{" "}
                                      {agent.emotions.arousal.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-medium">Needs:</p>
                                  <div className="grid grid-cols-2 gap-1 text-xs">
                                    <span>
                                      😴{" "}
                                      {(agent.needs.sleepiness * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                    <span>
                                      🍔 {(agent.needs.hunger * 100).toFixed(0)}
                                      %
                                    </span>
                                    <span>
                                      📚{" "}
                                      {(
                                        agent.needs.studyPressure * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                    <span>
                                      👥{" "}
                                      {(agent.needs.socialDrive * 100).toFixed(
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
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel>Places</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <MapPin className="h-4 w-4" />
                      <span>Dorm</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <MapPin className="h-4 w-4" />
                      <span>Lecture Hall</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <MapPin className="h-4 w-4" />
                      <span>Café</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <MapPin className="h-4 w-4" />
                      <span>Library</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <MapPin className="h-4 w-4" />
                      <span>Quad</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t">
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="flex flex-col gap-2 px-2 py-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    <PauseCircle className="h-4 w-4" />
                    Freeze Universe
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    Admin Panel
                  </Button>
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
                <span className="text-xs font-mono">00:00:00</span>
              </Badge>
            </div>
          </header>

          <main className="flex-1 overflow-hidden bg-muted/20 p-6 flex flex-col">
            <div className="flex-1 rounded-lg border border-dashed border-border overflow-hidden">
              <PixiMap onWorldReady={setIsWorldReady} />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
