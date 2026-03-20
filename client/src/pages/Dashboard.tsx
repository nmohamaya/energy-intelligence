import { useQuery } from "@tanstack/react-query";
import type { DashboardData } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { Zap, Server, CheckCircle2, BoltIcon, DollarSign, AlertTriangle, AlertCircle, Info, Clock, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";
import { useWebSocket, type ConnectionStatus } from "@/hooks/use-websocket";

const CHART_COLORS = [
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)",
];

function KpiCard({ title, value, unit, icon: Icon, loading }: {
  title: string; value: string; unit: string; icon: React.ElementType; loading: boolean;
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
              <p className="text-lg font-semibold font-data mt-1">
                {value}
                <span className="text-xs text-muted-foreground ml-1 font-sans">{unit}</span>
              </p>
            )}
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "critical") return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
  if (severity === "warning") return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
  return <Info className="w-3.5 h-3.5 text-blue-500" />;
}

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  if (status === "connected") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Wifi className="w-3.5 h-3.5" />
        <span>Live</span>
      </div>
    );
  }
  if (status === "connecting") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-pulse relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        <Wifi className="w-3.5 h-3.5" />
        <span>Connecting…</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground" />
      </span>
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline</span>
    </div>
  );
}

export default function Dashboard() {
  const { status: wsStatus, liveAlerts } = useWebSocket();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    // Only poll when WebSocket is disconnected; WS invalidation handles the rest
    refetchInterval: wsStatus === "connected" ? false : 60000,
  });

  // Merge live WebSocket alerts with REST alerts (live alerts show even before REST loads)
  const mergedAlerts = (() => {
    const restAlerts = data?.recentAlerts ?? [];
    const liveOnly = liveAlerts.filter(
      (la) => !restAlerts.some((ra) => ra.id === la.id),
    );
    const combined = [...liveOnly, ...restAlerts].slice(0, 7);
    return combined.length > 0 ? combined : undefined;
  })();

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Portfolio Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time monitoring across all renewable assets</p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionIndicator status={wsStatus} />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Last updated: {data ? formatDistanceToNow(new Date(), { addSuffix: true }) : "—"}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard title="Total Capacity" value={data?.kpis.totalCapacity.toFixed(1) ?? "—"} unit="GWp" icon={Zap} loading={isLoading} />
        <KpiCard title="Active Assets" value={data?.kpis.activeAssets.toString() ?? "—"} unit="" icon={Server} loading={isLoading} />
        <KpiCard title="Availability" value={data?.kpis.availability.toFixed(1) ?? "—"} unit="%" icon={CheckCircle2} loading={isLoading} />
        <KpiCard title="Energy Yield Today" value={data?.kpis.energyYieldToday.toFixed(1) ?? "—"} unit="GWh" icon={BoltIcon} loading={isLoading} />
        <KpiCard title="Revenue Today" value={data ? `€${data.kpis.revenueToday.toFixed(1)}M` : "—"} unit="" icon={DollarSign} loading={isLoading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Production chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium">Portfolio Energy Production (24h)</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            {isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data?.productionHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(215, 16%, 47%)" interval={3} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(215, 16%, 47%)" unit=" GWh" width={60} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(222, 35%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "hsl(210, 20%, 70%)" }}
                  />
                  <Line type="monotone" dataKey="production" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke="hsl(217, 91%, 60%)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Forecast" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut chart */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium">Asset Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pb-3">
            {isLoading ? (
              <Skeleton className="h-[180px] w-[180px] rounded-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={data?.assetBreakdown}
                      dataKey="percentage"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      strokeWidth={2}
                      stroke="hsl(222, 35%, 10%)"
                    >
                      {data?.assetBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "hsl(222, 35%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: 6, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {data?.assetBreakdown.map((item, i) => (
                    <div key={item.type} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[i] }} />
                      <span className="text-muted-foreground">{item.type} {item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top assets bar chart */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium">Top 10 Assets by Performance Ratio</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.topAssets} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(215, 16%, 47%)" domain={[70, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(215, 16%, 47%)" width={120} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: "hsl(222, 35%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="performanceRatio" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} name="PR %" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent alerts */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-medium">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {mergedAlerts?.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-2.5 rounded-md bg-muted/50"
                    data-testid={`alert-item-${alert.id}`}
                  >
                    <SeverityIcon severity={alert.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{alert.assetName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={alert.severity === "critical" ? "destructive" : "secondary"}
                      className="text-[10px] capitalize"
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PerplexityAttribution />
    </div>
  );
}
