"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, MessageSquare, TrendingUp, Users } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function DashboardPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: funnel } = useQuery({
    queryKey: ["funnel-metrics"],
    queryFn: () =>
      apiFetch<{ total: number; won: number; conversionRate: number; byStage: { stage: string; count: number }[] }>(
        "/leads/metrics/funnel",
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  const chartData =
    funnel?.byStage.map((s) => ({
      stage: s.stage.replace("_", " "),
      count: s.count,
    })) ?? [];

  return (
    <div className="p-8">
      <header className="mb-8">
        <p className="text-sm text-accent">Command Center</p>
        <h1 className="text-3xl font-bold tracking-tight">Revenue overview</h1>
        <p className="text-muted-foreground">Real-time intelligence across WhatsApp revenue operations</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total leads"
          value={funnel?.total ?? "—"}
          delta="+12% vs last week"
          trend="up"
          icon={<Users className="h-4 w-4 text-primary" />}
        />
        <MetricCard
          title="Won deals"
          value={funnel?.won ?? "—"}
          delta="Pipeline velocity"
          trend="neutral"
          icon={<TrendingUp className="h-4 w-4 text-success" />}
        />
        <MetricCard
          title="Conversion rate"
          value={funnel ? `${(funnel.conversionRate * 100).toFixed(1)}%` : "—"}
          trend="up"
          icon={<Activity className="h-4 w-4 text-accent" />}
        />
        <MetricCard
          title="Active conversations"
          value="—"
          delta="Connect WhatsApp"
          icon={<MessageSquare className="h-4 w-4 text-primary" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Funnel distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="stage" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Connect WhatsApp to see funnel analytics
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI activity stream</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {[
              { label: "Lead classified → Qualified", confidence: 0.91 },
              { label: "Auto-reply sent", confidence: 0.88 },
              { label: "Human handoff suggested", confidence: 0.62 },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-border bg-muted/30 p-3">
                <p>{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  AI confidence {(item.confidence * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
