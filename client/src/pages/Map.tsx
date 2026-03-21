/**
 * Asset Map — interactive geographic view of all energy assets.
 *
 * Teaching notes (for the learner):
 *
 * This page demonstrates several React patterns:
 * 1. useQuery — fetches asset data from the API (same as Dashboard)
 * 2. useState — local UI state (selected asset, filters)
 * 3. Conditional rendering — show/hide panels based on state
 * 4. Component composition — Map page assembles Leaflet + filter bar + detail panel
 * 5. Event handling — click handlers on map markers
 *
 * In C++ terms, this component is like a Controller class that:
 * - Owns the data (assets from API)
 * - Owns the UI state (which asset is selected, what filters are active)
 * - Passes const refs (props) to child components (markers, filter bar, detail panel)
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { Asset } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { MapPin, X, Zap, Activity, ThermometerSun } from "lucide-react";
import { Button } from "@/components/ui/button";
import "leaflet/dist/leaflet.css";

// --- Status → color mapping (same palette as the rest of the app) ---
const STATUS_COLORS: Record<string, string> = {
  Online: "#22c55e",      // green
  Warning: "#f59e0b",     // amber
  Offline: "#ef4444",     // red
  Maintenance: "#8b5cf6", // purple
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? "#94a3b8";
}

// --- Filter bar component ---
// This is a "controlled component" — its state lives in the parent (Map page),
// and it communicates changes upward via the onChange callback.
// In C++ terms: the parent owns the data, child gets a const& to read
// and a function pointer (callback) to request changes.

interface MapFilters {
  assetType: string;
  status: string;
  minHealth: number;
}

function MapFilterBar({ filters, onChange }: { filters: MapFilters; onChange: (f: MapFilters) => void }) {
  return (
    <Card className="bg-background/90 backdrop-blur border shadow-lg">
      <CardContent className="p-4 space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Asset Type</Label>
          <Select value={filters.assetType} onValueChange={(v) => onChange({ ...filters, assetType: v })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Solar">Solar</SelectItem>
              <SelectItem value="Wind">Wind</SelectItem>
              <SelectItem value="BESS">BESS</SelectItem>
              <SelectItem value="Hydro">Hydro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
          <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="Warning">Warning</SelectItem>
              <SelectItem value="Offline">Offline</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Min Health Score: {filters.minHealth}%
          </Label>
          <Slider
            min={0}
            max={100}
            step={5}
            value={[filters.minHealth]}
            onValueChange={([v]) => onChange({ ...filters, minHealth: v })}
            className="mt-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// --- Asset detail panel (slide-over when you click a marker) ---
// Shows the selected asset's details. Gets data via props (const& pattern).

function AssetDetailPanel({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  return (
    <Card className="w-80 bg-background/95 backdrop-blur border shadow-xl">
      <CardHeader className="pb-2 px-4 pt-4 flex flex-row items-start justify-between">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-sm font-medium truncate">{asset.name}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{asset.location}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 -mt-1" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge
            variant={asset.status === "Online" ? "default" : asset.status === "Offline" ? "destructive" : "secondary"}
            className="text-[10px] capitalize"
          >
            {asset.status}
          </Badge>
          <span className="text-xs text-muted-foreground">{asset.type}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Output</p>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary" />
              <p className="text-xs font-medium font-data">{(asset.currentOutput / 1000).toFixed(1)} MW</p>
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Capacity</p>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-primary" />
              <p className="text-xs font-medium font-data">{(asset.capacity / 1000).toFixed(1)} MW</p>
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Health</p>
            <div className="flex items-center gap-1">
              <ThermometerSun className="w-3 h-3 text-primary" />
              <p className="text-xs font-medium font-data">{asset.healthScore}%</p>
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Perf. Ratio</p>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-primary" />
              <p className="text-xs font-medium font-data">{asset.performanceRatio}%</p>
            </div>
          </div>
        </div>

        <div className="pt-1 border-t">
          <p className="text-[10px] text-muted-foreground">
            Daily Yield: <span className="font-data font-medium text-foreground">{(asset.dailyYield / 1000).toFixed(1)} MWh</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Helper: fit map bounds to asset locations ---
// This is a child component that uses useMap() — a Leaflet hook that gives
// access to the map instance. We need it as a child of <MapContainer>
// because the map instance only exists inside that context.
// In C++ terms: MapContainer is like a factory that creates the map object,
// and useMap() is like getting a reference to it from inside the factory scope.

function FitBounds({ assets }: { assets: Asset[] }) {
  const map = useMap();

  useMemo(() => {
    if (assets.length === 0) return;
    const lats = assets.map((a) => a.latitude);
    const lngs = assets.map((a) => a.longitude);
    map.fitBounds(
      [
        [Math.min(...lats) - 0.5, Math.min(...lngs) - 0.5],
        [Math.max(...lats) + 0.5, Math.max(...lngs) + 0.5],
      ],
      { padding: [20, 20] },
    );
  }, [assets, map]);

  return null; // This component renders nothing — it's just a side effect
}

// --- Main Map page ---

export default function AssetMap() {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [filters, setFilters] = useState<MapFilters>({
    assetType: "all",
    status: "all",
    minHealth: 0,
  });

  // Fetch all assets from API — same endpoint the Fleet page uses
  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  // Client-side filtering. useMemo caches the result so it only recalculates
  // when assets or filters change — like a cached computed property in C++.
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (filters.assetType !== "all" && asset.type !== filters.assetType) return false;
      if (filters.status !== "all" && asset.status !== filters.status) return false;
      if (asset.healthScore < filters.minHealth) return false;
      return true;
    });
  }, [assets, filters]);

  return (
    <div className="relative h-[calc(100vh-0px)] w-full">
      {/* Filter bar — positioned absolutely over the map */}
      <div className="absolute top-4 left-4 z-[1000] w-64">
        <MapFilterBar filters={filters} onChange={setFilters} />
      </div>

      {/* Asset count badge */}
      <div className="absolute top-4 left-72 z-[1000]">
        <Badge variant="secondary" className="text-xs">
          <MapPin className="w-3 h-3 mr-1" />
          {filteredAssets.length} assets
        </Badge>
      </div>

      {/* Selected asset detail panel */}
      {selectedAsset && (
        <div className="absolute top-4 right-4 z-[1000]">
          <AssetDetailPanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
        </div>
      )}

      {/* The map itself */}
      <MapContainer
        center={[51.2, 10.5]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        {/* Tile layer — the actual map imagery from OpenStreetMap.
            This is like a texture atlas in graphics — the map is made of
            256×256 pixel tiles loaded on demand as you pan/zoom. */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <FitBounds assets={filteredAssets} />

        {/* Render one CircleMarker per asset.
            Each marker is a React component — when you click it, we update
            the selectedAsset state, which triggers a re-render showing the
            detail panel. This is the declarative model from Lesson 2:
            we describe "if selectedAsset exists, show the panel" and React
            handles the DOM updates. */}
        {filteredAssets.map((asset) => (
          <CircleMarker
            key={asset.id}
            center={[asset.latitude, asset.longitude]}
            radius={8}
            pathOptions={{
              color: "#1e293b",
              weight: 2,
              fillColor: getStatusColor(asset.status),
              fillOpacity: 0.9,
            }}
            eventHandlers={{
              click: () => setSelectedAsset(asset),
            }}
          >
            <Popup>
              <div className="text-sm font-medium">{asset.name}</div>
              <div className="text-xs text-muted-foreground">{asset.type} — {asset.status}</div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="absolute bottom-4 left-4 z-[1000]">
        <PerplexityAttribution />
      </div>
    </div>
  );
}
