"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetaAiNotice } from "@/components/dashboard/meta-ai-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Bot, LineChart, Sparkles, Target, UserRound, Zap } from "lucide-react";

const features = [
  {
    icon: LineChart,
    title: "Conversation classification",
    description:
      "Every inbound message is analyzed for intent, sentiment, and pipeline stage — including threads where Meta Business Agent already replied.",
    href: "/dashboard/inbox",
  },
  {
    icon: Target,
    title: "Lead scoring",
    description: "Leads get a score from message content and engagement so your team focuses on closers.",
    href: "/dashboard/pipeline",
  },
  {
    icon: Zap,
    title: "Auto stage updates",
    description: "Pipeline moves when our classifier detects buying intent, negotiation, or loss signals.",
    href: "/dashboard/pipeline",
  },
  {
    icon: UserRound,
    title: "Human handoff flags",
    description:
      "When a customer needs a person, Growvisi flags the thread — Meta handles chat; you track who to call.",
    href: "/dashboard/insights",
  },
  {
    icon: Bot,
    title: "Lead timeline",
    description: "Audit trail of AI classifications and stage changes after each customer message.",
    href: "/dashboard/inbox",
  },
];

export default function AiStudioPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: capabilities, isLoading } = useQuery({
    queryKey: ["conversation-capabilities"],
    queryFn: () =>
      apiFetch<{
        aiClassification: boolean;
        aiSuggestReply: boolean;
        primaryUseCase: string;
      }>("/conversations/capabilities", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: stats } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{
        aiClassifications: number;
        classifiedLeads: number;
        humanHandoffRecommended: number;
      }>("/conversations/stats", { token: token ?? undefined }),
    enabled: !!token,
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Intelligence"
        description="Analyze WhatsApp conversations and track revenue outcomes — Meta replies in-chat, Growvisi tracks the funnel"
      />

      <div className="mb-6">
        <MetaAiNotice />
      </div>

      <Card className="mb-8 border-primary/20 bg-secondary/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-2 h-4 w-64" />
                </>
              ) : (
                <>
                  <p className="font-semibold">
                    Classification: {capabilities?.aiClassification ? "Active" : "Configure OPENAI_API_KEY"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stats
                      ? `${stats.aiClassifications} analyses · ${stats.classifiedLeads} leads scored · ${stats.humanHandoffRecommended} handoffs flagged`
                      : "Runs automatically on each inbound customer message."}
                  </p>
                </>
              )}
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard/inbox">View conversations</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <Card key={f.title} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">{f.title}</CardTitle>
              <CardDescription>{f.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={f.href} className="text-sm font-medium text-primary hover:underline">
                Open →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {capabilities?.aiSuggestReply && (
        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Optional: human takeover replies</CardTitle>
            <CardDescription>
              When your team must reply from Growvisi (not Meta Business Agent), use Human takeover
              in Conversations. This is supplementary — not our primary product surface.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
