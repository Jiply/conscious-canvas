"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  MapPin,
  Clock,
  Eye,
  PlayCircle,
  PauseCircle,
  Search,
  User,
  Activity,
} from "lucide-react";
import { PixiMap } from "@/components/PixiMap";

export default function SimPage() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
          <SidebarHeader className="border-b">
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Conscious Campus</h2>
              </div>
            </div>
            <div className="px-2 py-1">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span className="text-muted-foreground">World: </span>
                <Badge variant="secondary" className="gap-1">
                  <PlayCircle className="h-3 w-3" />
                  Running
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4" />
                <span className="text-muted-foreground">Observers: </span>
                <Badge variant="outline">1</Badge>
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
                    placeholder="Search by name, role, location..."
                    className="pl-8"
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
                    0
                  </Badge>
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No agents yet. They will appear here when the simulation
                  starts.
                </div>
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
            <div className="flex-1 rounded-lg border-2 border-dashed border-border overflow-hidden">
              <PixiMap />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
