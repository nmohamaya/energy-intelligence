import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Asset } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, MapPin, Calendar, Cpu, Zap, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; bg: string }> = {
    Online: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    Warning: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    Offline: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    Maintenance: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  };
  const v = variants[status] ?? variants.Offline;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${v.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${v.color.replace("text-", "bg-")}`} />
      <span className={v.color}>{status}</span>
    </span>
  );
}

export default function Fleet() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const queryParams = new URLSearchParams();
  if (typeFilter !== "all") queryParams.set("type", typeFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (search) queryParams.set("search", search);

  const queryString = queryParams.toString();

  const { data: assets, isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets", queryString],
    queryFn: async () => {
      const url = queryString ? `/api/assets?${queryString}` : "/api/assets";
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Asset Fleet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage and monitor all renewable energy assets</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
            data-testid="input-search"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] h-9 text-sm" data-testid="select-type-filter">
            <SelectValue placeholder="Asset Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Solar">Solar</SelectItem>
            <SelectItem value="Wind">Wind</SelectItem>
            <SelectItem value="BESS">BESS</SelectItem>
            <SelectItem value="Hydro">Hydro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-9 text-sm" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Capacity</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">PR %</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Health</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : (
                  assets?.map((asset) => (
                    <tr
                      key={asset.id}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedAsset(asset)}
                      data-testid={`row-asset-${asset.id}`}
                    >
                      <td className="px-4 py-3 font-medium">{asset.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">{asset.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{asset.location}</td>
                      <td className="px-4 py-3 text-right font-data text-xs">{(asset.capacity / 1000).toFixed(0)} MWp</td>
                      <td className="px-4 py-3"><StatusBadge status={asset.status} /></td>
                      <td className="px-4 py-3 text-right font-data text-xs">{asset.performanceRatio.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <Progress
                            value={asset.healthScore}
                            className="h-1.5 flex-1"
                          />
                          <span className="font-data text-xs w-8 text-right">{asset.healthScore}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Asset detail slide-over */}
      <Sheet open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
          {selectedAsset && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{selectedAsset.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-3">
                  <StatusBadge status={selectedAsset.status} />
                  <Badge variant="secondary">{selectedAsset.type}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DetailItem icon={MapPin} label="Location" value={selectedAsset.location} />
                  <DetailItem icon={Zap} label="Capacity" value={`${(selectedAsset.capacity / 1000).toFixed(1)} MWp`} />
                  <DetailItem icon={Activity} label="Current Output" value={`${(selectedAsset.currentOutput / 1000).toFixed(1)} MW`} />
                  <DetailItem icon={Zap} label="Daily Yield" value={`${(selectedAsset.dailyYield / 1000).toFixed(1)} MWh`} />
                  <DetailItem icon={Calendar} label="Installed" value={selectedAsset.installedDate} />
                  <DetailItem icon={Cpu} label="Inverters" value={selectedAsset.inverterCount.toString()} />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Health Score</p>
                  <div className="flex items-center gap-3">
                    <Progress value={selectedAsset.healthScore} className="h-2 flex-1" />
                    <span className="font-data text-sm font-semibold">{selectedAsset.healthScore}%</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Performance Ratio</p>
                  <div className="flex items-center gap-3">
                    <Progress value={selectedAsset.performanceRatio} className="h-2 flex-1" />
                    <span className="font-data text-sm font-semibold">{selectedAsset.performanceRatio}%</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Last communication: {format(new Date(selectedAsset.lastCommunication), "PPp")}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <PerplexityAttribution />
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium font-data">{value}</p>
      </div>
    </div>
  );
}
