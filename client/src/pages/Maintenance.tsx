import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Prediction } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Brain, AlertTriangle, Target, DollarSign } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format, differenceInDays } from "date-fns";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

const RISK_COLORS: Record<string, string> = {
  Critical: "text-red-400 bg-red-500/10 border-red-500/20",
  High: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Medium: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  Low: "text-green-400 bg-green-500/10 border-green-500/20",
};

function RiskBadge({ level }: { level: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${RISK_COLORS[level] ?? ""}`}>
      {level}
    </span>
  );
}

export default function Maintenance() {
  const [riskFilter, setRiskFilter] = useState("all");

  const { data: predictions, isLoading } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions", riskFilter],
    queryFn: async () => {
      const url = riskFilter !== "all" ? `/api/predictions?risk=${riskFilter}` : "/api/predictions";
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  // Timeline chart data
  const timelineData = predictions?.map((p) => ({
    name: p.component.length > 16 ? p.component.slice(0, 14) + "…" : p.component,
    daysUntil: differenceInDays(new Date(p.predictedFailureDate), new Date()),
    confidence: p.confidence,
    risk: p.riskLevel,
  })) ?? [];

  const criticalCount = predictions?.filter((p) => p.riskLevel === "Critical").length ?? 0;

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-semibold" data-testid="text-page-title">Predictive Maintenance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">AI-powered failure predictions and recommended actions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard icon={Brain} title="Predictions Active" value="23" loading={isLoading} />
        <SummaryCard icon={AlertTriangle} title="Critical" value={String(criticalCount)} loading={isLoading} accent />
        <SummaryCard icon={DollarSign} title="Estimated Savings" value="€847K" loading={isLoading} />
        <SummaryCard icon={Target} title="Model Accuracy" value="94.2%" loading={isLoading} />
      </div>

      {/* Timeline chart */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-medium">Predicted Failures — Next 90 Days</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={timelineData} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(215, 16%, 47%)" label={{ value: "Days until failure", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(215, 16%, 47%)" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(215, 16%, 47%)" width={110} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "hsl(222, 35%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: 6, fontSize: 12 }}
                  formatter={(value: number, name: string) => [`${value} days`, "Days to Failure"]}
                />
                <Bar dataKey="daysUntil" radius={[0, 4, 4, 0]} name="Days">
                  {timelineData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.risk === "Critical" ? "hsl(0, 84%, 60%)" :
                        entry.risk === "High" ? "hsl(38, 92%, 50%)" :
                        entry.risk === "Medium" ? "hsl(217, 91%, 60%)" :
                        "hsl(142, 71%, 45%)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Filter + Table */}
      <div className="flex items-center gap-3">
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm" data-testid="select-risk-filter">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="Critical">Critical</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Component</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Predicted Failure</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Confidence</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      ))}
                    </tr>
                  ))
                ) : (
                  predictions?.map((pred) => (
                    <tr key={pred.id} className="border-b border-border/50" data-testid={`row-prediction-${pred.id}`}>
                      <td className="px-4 py-3 font-medium">{pred.assetName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{pred.component}</td>
                      <td className="px-4 py-3 font-data text-xs">
                        {format(new Date(pred.predictedFailureDate), "MMM dd, yyyy")}
                        <span className="text-muted-foreground ml-1">
                          ({differenceInDays(new Date(pred.predictedFailureDate), new Date())}d)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-data text-xs">{pred.confidence}%</td>
                      <td className="px-4 py-3"><RiskBadge level={pred.riskLevel} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px] truncate">{pred.recommendedAction}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PerplexityAttribution />
    </div>
  );
}

function SummaryCard({ icon: Icon, title, value, loading, accent }: {
  icon: React.ElementType; title: string; value: string; loading: boolean; accent?: boolean;
}) {
  return (
    <Card data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className={`text-lg font-semibold font-data mt-1 ${accent ? "text-red-400" : ""}`}>{value}</p>
            )}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? "bg-red-500/10" : "bg-primary/10"}`}>
            <Icon className={`w-4 h-4 ${accent ? "text-red-400" : "text-primary"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
