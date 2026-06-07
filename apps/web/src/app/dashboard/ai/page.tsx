"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Bot, MessageSquare, Sparkles, Target, Zap } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Suggest reply",
    description: "AI drafts replies from conversation context. Available in Inbox when enabled.",
    href: "/dashboard/inbox",
  },
  {
    icon: Target,
    title: "Lead scoring",
    description: "Every lead gets an intent score based on message content and engagement.",
    href: "/dashboard/pipeline",
  },
  {
    icon: Zap,
    title: "Auto stage updates",
    description: "Pipeline stages update automatically when AI detects buying intent.",
    href: "/dashboard/pipeline",
  },
  {
    icon: Bot,
    title: "Lead timeline",
    description: "See AI classifications and stage changes in each conversation's timeline.",
    href: "/dashboard/inbox",
  },
];

export default function AiStudioPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: capabilities, isLoading } = useQuery({
    queryKey: ["conversation-capabilities"],
    queryFn: () =>
      apiFetch<{ aiSuggestReply: boolean }>("/conversations/capabilities", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="AI"
        description="Smart tools that help your team sell faster on WhatsApp"
      />

      <Card className="mb-8 border-primary/20 bg-secondary/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-2 h-4 w-64" />
                </>
              ) : (
                <>
                  <p className="font-semibold">
                    AI reply suggestions: {capabilities?.aiSuggestReply ? "Enabled" : "Disabled"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {capabilities?.aiSuggestReply
                      ? "Use “Suggest reply” in Inbox to draft responses instantly."
                      : "AI features require API configuration on the server."}
                  </p>
                </>
              )}
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard/inbox">Open Inbox</Link>
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
                Go to {f.href.split("/").pop()} →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
