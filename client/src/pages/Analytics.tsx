import { useQuery } from "@tanstack/react-query";
import type { AnalyticsData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Zap, AlertTriangle, DollarSign, Clock, ArrowUpRight } from "lucide-react";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const DISPATCH_COLORS: Record<string, string> = {
  dispatched: "bg-green-500",
  curtailed: "bg-red-500",
  standby: "bg-muted-foreground/30",
};

export default function Analytics() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  // Group dispatch by day for heatmap
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dispatchByDay = days.map((day) => ({
    day,
    hours: data?.dispatchSchedule.filter((d) => d.day === day).sort((a, b) => a.hour - b.hour) ?? [],
  }));

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Energy Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Production analysis, curtailment tracking, and revenue optimization</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <SummaryCard
          title="Total Production"
          value={data ? `${data.summary.totalProduction.toFixed(2)} TWh` : "—"}
          icon={Zap}
          loading={isLoading}
        />
        <SummaryCard
          title="Total Curtailment"
          value={data ? `${data.summary.totalCurtailment} GWh (${data.summary.curtailmentPercentage}%)` : "—"}
          icon={AlertTriangle}
          loading={isLoading}
          accent
        />
        <SummaryCard
          title="Avg Revenue/MWh"
          value={data ? `€${data.summary.avgRevenuePerMwh.toFixed(2)}` : "—"}
          icon={DollarSign}
          loading={isLoading}
        />
      </div>

      {/* Curtailment chart */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-medium">Production vs Curtailment (30 Days)</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data?.curtailmentHistory} margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9 }}
                  stroke="hsl(215, 16%, 47%)"
                  tickFormatter={(v: string) => v.slice(5)}
                  interval={4}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 16%, 47%)" unit=" GWh" width={60} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "hsl(222, 35%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: 6, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="production" stackId="1" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.3} name="Production" />
                <Area type="monotone" dataKey="curtailment" stackId="1" stroke="hsl(0, 84%, 60%)" fill="hsl(0, 84%, 60%)" fillOpacity={0.4} name="Curtailment" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Energy loss breakdown */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium">Energy Loss Breakdown (GWh)</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.lossBreakdown} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(215, 16%, 47%)" unit=" GWh" />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} stroke="hsl(215, 16%, 47%)" width={120} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(222, 35%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: 6, fontSize: 12 }}
                    formatter={(v: number, name: string, props: any) => [`${v} GWh (${props.payload.percentage}%)`, "Loss"]}
                  />
                  <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue optimization cards */}
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Spot Price Now</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <p className="text-lg font-semibold font-data mt-1">€{data?.revenueCards.spotPriceNow.toFixed(2)}<span className="text-xs text-muted-foreground ml-1">/MWh</span></p>
                  )}
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Optimal Dispatch Window</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-32 mt-1" />
                  ) : (
                    <p className="text-lg font-semibold mt-1">{data?.revenueCards.optimalDispatchWindow}</p>
                  )}
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Arbitrage Opportunity</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-28 mt-1" />
                  ) : (
                    <p className="text-lg font-semibold font-data mt-1 text-primary">
                      €{((data?.revenueCards.arbitrageOpportunity ?? 0) / 1000).toFixed(1)}K
                      <ArrowUpRight className="w-4 h-4 inline-block ml-1 text-primary" />
                    </p>
                  )}
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dispatch Heatmap */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-medium">Grid Dispatch Schedule</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <div className="space-y-1.5">
              {/* Hour labels */}
              <div className="flex items-center gap-0.5 ml-10">
                {Array.from({ length: 24 }).map((_, h) => (
                  <div key={h} className="flex-1 text-center text-[9px] text-muted-foreground font-data">
                    {h % 3 === 0 ? `${String(h).padStart(2, "0")}` : ""}
                  </div>
                ))}
              </div>
              {dispatchByDay.map(({ day, hours }) => (
                <div key={day} className="flex items-center gap-0.5">
                  <span className="w-10 text-xs text-muted-foreground text-right pr-2">{day}</span>
                  {hours.map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-5 rounded-sm ${DISPATCH_COLORS[h.status]}`}
                      title={`${day} ${String(h.hour).padStart(2, "0")}:00 — ${h.status}`}
                    />
                  ))}
                </div>
              ))}
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 ml-10">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-sm bg-green-500" />
                  Dispatched
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-sm bg-red-500" />
                  Curtailed
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded-sm bg-muted-foreground/30" />
                  Standby
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PerplexityAttribution />
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, loading, accent }: {
  title: string; value: string; icon: React.ElementType; loading: boolean; accent?: boolean;
}) {
  return (
    <Card data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className={`text-lg font-semibold font-data mt-1 ${accent ? "text-amber-400" : ""}`}>{value}</p>
            )}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? "bg-amber-500/10" : "bg-primary/10"}`}>
            <Icon className={`w-4 h-4 ${accent ? "text-amber-400" : "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
