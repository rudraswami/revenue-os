"use client";

import { IndianRupee, BarChart3 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { CTA } from "@/lib/brand-copy";
import { CHART_ACCENT, chartTooltipStyle } from "@/lib/chart-theme";

export interface AnalyticsBarChartsProps {
  barData: Array<{ stage: string; count: number }>;
  valueBarData: Array<{ stage: string; value: number }>;
  hasWhatsapp: boolean;
}

export function AnalyticsBarCharts({ barData, valueBarData, hasWhatsapp }: AnalyticsBarChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <DashboardPanel title="Leads by stage" contentClassName="h-72" delay={0.1}>
        {barData.some((d) => d.count > 0) ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={barData}>
              <XAxis dataKey="stage" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill={CHART_ACCENT} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            compact
            className="h-full py-8"
            icon={<BarChart3 className="h-6 w-6" />}
            title={hasWhatsapp ? "No leads in this period" : "Connect WhatsApp first"}
            description={
              hasWhatsapp
                ? "Try a wider date range or wait for new customer messages."
                : "Link WhatsApp to start tracking pipeline metrics."
            }
            actionHref={hasWhatsapp ? "/dashboard/inbox" : "/onboarding"}
            actionLabel={hasWhatsapp ? CTA.openConversations : "Connect WhatsApp"}
          />
        )}
      </DashboardPanel>

      <DashboardPanel title="Pipeline value by stage (₹)" contentClassName="h-72" delay={0.15}>
        {valueBarData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <BarChart data={valueBarData}>
              <XAxis dataKey="stage" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: number) => [
                  new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(v),
                  "Value",
                ]}
              />
              <Bar dataKey="value" fill={CHART_ACCENT} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            compact
            className="h-full py-8"
            icon={<IndianRupee className="h-6 w-6" />}
            title="No deal values yet"
            description="Add ₹ values on Pipeline or Contacts to see revenue by stage."
            actionHref="/dashboard/pipeline"
            actionLabel="View Pipeline"
          />
        )}
      </DashboardPanel>
    </div>
  );
}
