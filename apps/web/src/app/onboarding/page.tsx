"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";
import { WhatsappConnectWizard } from "@/components/settings/whatsapp-connect-wizard";
import { WhatsappIngestionVerifier } from "@/components/settings/whatsapp-ingestion-verifier";
import { WhatsappOnboardingFaq } from "@/components/settings/whatsapp-onboarding-faq";
import { WhatsappOnboardingHelp } from "@/components/settings/whatsapp-onboarding-help";
import { apiFetch } from "@/lib/api-client";
import { timeGreeting } from "@/lib/greeting";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);

  const { data: accounts } = useQuery({
    queryKey: ["whatsapp-accounts"],
    queryFn: () =>
      apiFetch<Array<{ isActive: boolean; displayPhoneNumber: string; verifiedName: string | null }>>(
        "/whatsapp-accounts",
        { token: token ?? undefined },
      ),
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
  const activeAccount = accounts?.find((a) => a.isActive);

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
      title: "Connect your existing WhatsApp number",
      done: whatsappConnected,
      description: "Paste your Meta token — we find your number and connect in one click.",
    },
    {
      id: "inbox",
      title: "Receive your first customer message",
      done: firstMessageReceived,
      description: "From your phone, send WhatsApp to your business number to verify ingestion.",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="min-h-screen surface-lavender">
      <header className="border-b border-border/80 bg-white/90 px-6 py-4 backdrop-blur-sm">
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
        <div className="mb-8 overflow-hidden rounded-2xl border border-border/80 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Setup wizard</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            {timeGreeting(user?.name)}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Connect your existing WhatsApp business number when you&apos;re ready — explore the app first if you prefer.
          </p>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-[12px] font-medium text-muted-foreground">
              <span>Setup progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-[#128C7E] transition-all duration-500"
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
                "flex gap-4 rounded-xl border p-4 transition-all duration-200",
                step.done
                  ? "border-success/30 bg-success/5 shadow-sm"
                  : "border-border/80 bg-white shadow-sm hover:border-primary/20",
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
          <div className="space-y-6">
            <WhatsappConnectWizard />
            <WhatsappOnboardingHelp />
            <WhatsappOnboardingFaq />
            <p className="text-center text-sm text-muted-foreground">
              Not ready yet?{" "}
              <Link href="/dashboard" className="font-medium text-primary hover:underline">
                Go to dashboard
              </Link>{" "}
              — you can connect WhatsApp anytime from Settings.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-success/30 bg-success/5 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" />
                WhatsApp connected
                {activeAccount?.displayPhoneNumber && (
                  <span className="font-mono text-muted-foreground">
                    · {activeAccount.displayPhoneNumber}
                  </span>
                )}
              </div>
            </div>
            {activeAccount?.displayPhoneNumber && (
              <WhatsappIngestionVerifier displayPhoneNumber={activeAccount.displayPhoneNumber} />
            )}
            <WhatsappOnboardingFaq />
          </div>
        )}
      </main>
    </div>
  );
}
