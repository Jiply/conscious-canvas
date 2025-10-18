"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Home,
  Building2,
} from "lucide-react";
import { useState } from "react";

export default function InitPage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const initMap = useMutation(api.map.initMap);
  const settings = useQuery(api.map.getMapSettings);
  const places = useQuery(api.map.getPlaces);

  async function handleInit(force: boolean = false) {
    setIsInitializing(true);
    setResult(null);

    try {
      const res = await initMap({
        seed: `utown_${Date.now()}`,
        force,
      });
      setResult(res);
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Failed to initialize map",
      });
    } finally {
      setIsInitializing(false);
    }
  }

  const isMapInitialized = settings !== undefined && settings !== null;

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">🗺️ Map Initialization</h1>
          <p className="text-muted-foreground">
            Initialize the NUS UTown-inspired campus with landmarks and dorm
            rooms
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Database Status</CardTitle>
            <CardDescription>Current state of the map database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Map Initialized:</span>
              {isMapInitialized ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Yes
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  No
                </Badge>
              )}
            </div>

            {settings && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Grid Size
                  </div>
                  <div className="text-2xl font-bold">
                    {settings.gridWidth} × {settings.gridHeight}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {settings.gridWidth * settings.gridHeight} tiles
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Tile Size
                  </div>
                  <div className="text-2xl font-bold">
                    {settings.tileSize}px
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {settings.metersPerTile}m per tile
                  </div>
                </div>
              </div>
            )}

            {places && places.length > 0 && (
              <div className="pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Places Created
                </div>
                <div className="text-2xl font-bold mb-3">
                  {places.length} total
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">Main Landmarks:</span>
                    <Badge variant="outline">
                      {
                        places.filter((p) =>
                          [
                            "library",
                            "lecture",
                            "cafe",
                            "quad",
                            "dorm",
                          ].includes(p.kind)
                        ).length
                      }
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Home className="h-4 w-4" />
                    <span className="font-medium">Dorm Rooms:</span>
                    <Badge variant="outline">
                      {places.filter((p) => p.kind === "dorm_room").length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Common Areas:</span>
                    <Badge variant="outline">
                      {
                        places.filter((p) =>
                          ["common_room", "study_room"].includes(p.kind)
                        ).length
                      }
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result Card */}
        {result && (
          <Card
            className={result.success ? "border-green-500" : "border-red-500"}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Success!
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Error
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">{result.message}</p>
              {result.tilesCreated && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>✓ Tiles created: {result.tilesCreated}</div>
                  <div>✓ Places created: {result.placesCreated}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Initialize or regenerate the campus map
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => handleInit(false)}
              disabled={isInitializing || isMapInitialized}
              className="w-full"
              size="lg"
            >
              {isInitializing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                "Initialize Map"
              )}
            </Button>

            {isMapInitialized && (
              <Button
                onClick={() => handleInit(true)}
                disabled={isInitializing}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  "Force Regenerate"
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Place List */}
        {places && places.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Places</CardTitle>
              <CardDescription>All locations in the campus</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {places.map((place) => (
                  <div
                    key={place._id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{place.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {place.kind} • {place.bounds.width}×
                        {place.bounds.height} tiles
                        {place.capacity && ` • Capacity: ${place.capacity}`}
                      </div>
                    </div>
                    <Badge variant={place.isIndoor ? "default" : "secondary"}>
                      {place.isIndoor ? "Indoor" : "Outdoor"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
