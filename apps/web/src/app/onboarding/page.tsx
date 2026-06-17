"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const WhatsappConnect = dynamic(() => import("@/components/settings/whatsapp-connect"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  ),
});

export default function OnboardingPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () => apiFetch<Array<{ isActive: boolean }>>("/whatsapp-accounts", {
      token: token ?? undefined,
    }),
    enabled: !!token,
    refetchInterval: 3000,
  });

  const { data: convStats } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{ inboundMessages: number }>("/conversations/stats", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    refetchInterval: 5000,
  });

  const whatsappConnected = accounts?.some((a) => a.isActive) ?? false;
  const firstMessageReceived = (convStats?.inboundMessages ?? 0) > 0;

  useEffect(() => {
    if (whatsappConnected) {
      patchOnboarding({
        whatsappConnected: true,
        firstMessageReceived,
        complete: true,
      });
    }
  }, [whatsappConnected, firstMessageReceived, patchOnboarding]);

  const steps = [
    {
      id: "account",
      title: "Workspace created",
      done: true,
      description: organization?.name ?? "Your workspace is ready.",
    },
    {
      id: "explore",
      title: "Explore Growvisi",
      done: true,
      description: "Inbox, Pipeline, and Insights are ready — no WhatsApp required.",
    },
    {
      id: "whatsapp",
      title: "Connect WhatsApp Business",
      done: whatsappConnected,
      description: "Optional — link the number your customers message today.",
    },
    {
      id: "inbox",
      title: "Receive your first message",
      done: firstMessageReceived,
      description: "Send a test WhatsApp after connecting your number.",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            {whatsappConnected ? (
              <Button size="sm" onClick={() => router.push("/dashboard/inbox")}>
                Open Inbox
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
                Skip for now
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect WhatsApp when you&apos;re ready — you can explore the app first.
          </p>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-[12px] font-medium text-muted-foreground">
              <span>Setup progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <ol className="mb-10 space-y-3">
          {steps.map((step, i) => (
            <li
              key={step.id}
              className={cn(
                "flex gap-4 rounded-xl border p-4 transition-colors",
                step.done ? "border-success/30 bg-success/5" : "border-border bg-white",
              )}
            >
              <div className="mt-0.5 shrink-0">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Step {i + 1}
                </p>
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        {!whatsappConnected ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
              <WhatsappConnect />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Not ready yet?{" "}
              <Link href="/dashboard" className="font-medium text-primary hover:underline">
                Go to dashboard
              </Link>{" "}
              — you can connect WhatsApp anytime from Settings.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-xl font-semibold">WhatsApp is connected!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Send a WhatsApp to your business number — it will appear in Inbox instantly.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/dashboard/inbox">Open Inbox</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">Go to Home</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
