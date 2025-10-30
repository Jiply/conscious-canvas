"use client";
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  HomeIcon,
  MapPinIcon,
  Loader2Icon,
  Building2Icon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { Fragment, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";

export default function InitPage() {
  const [result, setResult] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const places = useQuery(api.map.getPlaces);
  const initMap = useMutation(api.map.initMap);
  const settings = useQuery(api.map.getMapSettings);

  async function handleInit(force: boolean = false) {
    setIsInitializing(true);
    setResult(null);

    try {
      const res = await initMap({ seed: `utown_${Date.now()}`, force });
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
                  <CheckCircle2Icon className="size-3" />
                  Yes
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <AlertCircleIcon className="size-3" />
                  No
                </Badge>
              )}
            </div>
            {settings ? (
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
            ) : null}
            {places && places.length > 0 ? (
              <div className="pt-4 border-t">
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Places Created
                </div>
                <div className="text-2xl font-bold mb-3">
                  {places.length} total
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2Icon className="h-4 w-4" />
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
                    <HomeIcon className="h-4 w-4" />
                    <span className="font-medium">Dorm Rooms:</span>
                    <Badge variant="outline">
                      {places.filter((p) => p.kind === "dorm_room").length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPinIcon className="h-4 w-4" />
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
            ) : null}
          </CardContent>
        </Card>
        {/* Result Card */}
        {result ? (
          <Card
            className={result.success ? "border-green-500" : "border-red-500"}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <Fragment>
                    <CheckCircle2Icon className="size-5 text-green-500" />
                    Success!
                  </Fragment>
                ) : (
                  <Fragment>
                    <AlertCircleIcon className="size-5 text-red-500" />
                    Error
                  </Fragment>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">{result.message}</p>
              {result.tilesCreated ? (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>✓ Tiles created: {result.tilesCreated}</div>
                  <div>✓ Places created: {result.placesCreated}</div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
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
              size="lg"
              className="w-full"
              onClick={() => handleInit(false)}
              disabled={isInitializing || isMapInitialized}
            >
              {isInitializing ? (
                <Fragment>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Initializing...
                </Fragment>
              ) : (
                "Initialize Map"
              )}
            </Button>
            {isMapInitialized ? (
              <Button
                size="lg"
                className="w-full"
                variant="destructive"
                disabled={isInitializing}
                onClick={() => handleInit(true)}
              >
                {isInitializing ? (
                  <Fragment>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </Fragment>
                ) : (
                  "Force Regenerate"
                )}
              </Button>
            ) : null}
          </CardContent>
        </Card>
        {/* Place List */}
        {places && places.length > 0 ? (
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
        ) : null}
      </div>
    </div>
  );
}
