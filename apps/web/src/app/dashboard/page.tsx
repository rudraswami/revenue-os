"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { MessageSquare, TrendingUp, Users } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  const { data: convStats } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{ totalConversations: number; unreadMessages: number }>("/conversations/stats", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: whatsappAccounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
  });

  const hasWhatsapp = whatsappAccounts?.some((a) => a.isActive) ?? false;
  const hasLeads = (funnel?.total ?? 0) > 0;
  const hasConversations = (convStats?.totalConversations ?? 0) > 0;

  const chartData =
    funnel?.byStage.map((s) => ({
      stage: s.stage.replace("_", " "),
      count: s.count,
    })) ?? [];

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Home</h1>
        <p className="text-muted-foreground">Your WhatsApp sales at a glance</p>
      </header>

      {!hasWhatsapp && (
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="font-medium">Connect WhatsApp to get started</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Link your business number and customer messages will appear in your Inbox.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/settings">Connect WhatsApp</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Conversations"
          value={hasConversations ? convStats!.totalConversations : 0}
          delta={
            hasWhatsapp
              ? `${convStats?.unreadMessages ?? 0} unread`
              : "Connect WhatsApp"
          }
          trend="neutral"
          icon={<MessageSquare className="h-4 w-4 text-primary" />}
        />
        <MetricCard
          title="Total leads"
          value={funnel?.total ?? 0}
          trend="neutral"
          icon={<Users className="h-4 w-4 text-primary" />}
        />
        <MetricCard
          title="Won"
          value={funnel?.won ?? 0}
          trend="neutral"
          icon={<TrendingUp className="h-4 w-4 text-success" />}
        />
        <MetricCard
          title="Win rate"
          value={funnel && funnel.total > 0 ? `${(funnel.conversionRate * 100).toFixed(0)}%` : "—"}
          trend="neutral"
          icon={<TrendingUp className="h-4 w-4 text-accent" />}
        />
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Leads by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {hasLeads && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="stage" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
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
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                {hasWhatsapp ? (
                  <>
                    <p>Leads appear when customers message you</p>
                    <Link href="/dashboard/inbox" className="text-primary hover:underline">
                      Open Inbox
                    </Link>
                  </>
                ) : (
                  <>
                    <p>Connect WhatsApp to start tracking leads</p>
                    <Link href="/dashboard/settings" className="text-primary hover:underline">
                      Connect WhatsApp
                    </Link>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
