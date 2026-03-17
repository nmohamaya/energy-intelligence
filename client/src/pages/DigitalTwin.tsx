import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Asset, DigitalTwinData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, RadialBarChart, RadialBar, Legend,
} from "recharts";
import { Cpu, Thermometer, Sun, Wind, Droplets, Gauge, Play, CheckCircle } from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

function MetricGauge({ label, value, unit, max, icon: Icon, color }: {
  label: string; value: number; unit: string; max: number; icon: React.ElementType; color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <span className="font-data text-sm font-semibold">{value}{unit}</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

export default function DigitalTwin() {
  const [selectedAssetId, setSelectedAssetId] = useState("asset-1");
  const [simulated, setSimulated] = useState(false);

  const { data: assets } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: twinData, isLoading } = useQuery<DigitalTwinData>({
    queryKey: ["/api/digital-twin", selectedAssetId],
  });

  const handleRunSimulation = () => {
    setSimulated(true);
    setTimeout(() => setSimulated(false), 3000);
  };

  const scenarioChartData = twinData?.scenarios.map((s) => ({
    name: s.name,
    energy: Math.round(s.projectedEnergy / 1000),
    revenue: Math.round(s.projectedRevenue / 1000),
    confidence: s.confidence,
  })) ?? [];

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Digital Twin</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Virtual asset simulation and scenario analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAssetId} onValueChange={(v) => { setSelectedAssetId(v); setSimulated(false); }}>
            <SelectTrigger className="w-[260px] h-9 text-sm" data-testid="select-asset">
              <SelectValue placeholder="Select an asset" />
            </SelectTrigger>
            <SelectContent>
              {assets?.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleRunSimulation}
            disabled={isLoading || simulated}
            size="sm"
            className="gap-2"
            data-testid="button-run-simulation"
          >
            {simulated ? <CheckCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {simulated ? "Simulated" : "Run Simulation"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      ) : twinData ? (
        <>
          {/* Asset info bar */}
          <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border">
            <Badge variant="secondary">{twinData.asset.type}</Badge>
            <span className="text-sm">{twinData.asset.name}</span>
            <span className="text-xs text-muted-foreground">{twinData.asset.location}</span>
            <span className="text-xs font-data ml-auto">{(twinData.asset.capacity / 1000).toFixed(1)} MWp</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Real-time metrics */}
            <Card>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-medium">Real-Time Metrics</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <MetricGauge
                  label="Power Output"
                  value={Math.round(twinData.realTimeMetrics.powerOutput / 1000 * 10) / 10}
                  unit=" MW"
                  max={twinData.asset.capacity / 1000}
                  icon={Gauge}
                  color="text-green-400"
                />
                <MetricGauge
                  label="Temperature"
                  value={twinData.realTimeMetrics.temperature}
                  unit="°C"
                  max={70}
                  icon={Thermometer}
                  color="text-amber-400"
                />
                {twinData.realTimeMetrics.irradiance !== undefined && (
                  <MetricGauge
                    label="Irradiance"
                    value={twinData.realTimeMetrics.irradiance}
                    unit=" W/m²"
                    max={1200}
                    icon={Sun}
                    color="text-yellow-400"
                  />
                )}
                {twinData.realTimeMetrics.windSpeed !== undefined && (
                  <MetricGauge
                    label="Wind Speed"
                    value={twinData.realTimeMetrics.windSpeed}
                    unit=" m/s"
                    max={25}
                    icon={Wind}
                    color="text-blue-400"
                  />
                )}
                <MetricGauge
                  label="Humidity"
                  value={twinData.realTimeMetrics.humidity}
                  unit="%"
                  max={100}
                  icon={Droplets}
                  color="text-sky-400"
                />
                <MetricGauge
                  label="Efficiency"
                  value={twinData.realTimeMetrics.efficiency}
                  unit="%"
                  max={100}
                  icon={Cpu}
                  color="text-primary"
                />
              </CardContent>
            </Card>

            {/* Scenario comparison */}
            <Card>
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-medium">Scenario Comparison — Projected Energy (MWh)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={scenarioChartData} margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 16%, 47%)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 16%, 47%)" />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(222, 35%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: 6, fontSize: 12 }}
                    />
                    <Bar dataKey="energy" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Energy (MWh)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Scenario details table */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium">Scenario Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenario</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Projected Energy</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Projected Revenue</th>
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {twinData.scenarios.map((s, i) => (
                    <tr key={i} className="border-b border-border/50" data-testid={`row-scenario-${i}`}>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-right font-data text-xs">{(s.projectedEnergy / 1000).toFixed(1)} MWh</td>
                      <td className="px-4 py-3 text-right font-data text-xs">€{(s.projectedRevenue / 1000).toFixed(1)}K</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Progress value={s.confidence} className="h-1.5 w-16" />
                          <span className="font-data text-xs">{s.confidence}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Select an asset to view its digital twin
        </div>
      )}

      <PerplexityAttribution />
    </div>
  );
}
