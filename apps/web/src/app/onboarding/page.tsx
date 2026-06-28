"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Inbox,
  Kanban,
  Shield,
  Users,
} from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { Button } from "@/components/ui/button";
import WhatsappConnect from "@/components/settings/whatsapp-connect";
import { WhatsappGoLiveChecklist } from "@/components/settings/whatsapp-go-live-checklist";
import { WhatsappOnboardingFaq } from "@/components/settings/whatsapp-onboarding-faq";
import { WhatsappOnboardingHelp } from "@/components/settings/whatsapp-onboarding-help";
import { apiFetch } from "@/lib/api-client";
import { timeGreeting } from "@/lib/greeting";
import { useAuthStore } from "@/stores/auth-store";

const VALUE_PROPS = [
  {
    icon: Bot,
    title: "AI reads every message",
    desc: "Intent, urgency, and pipeline stage — scored automatically.",
  },
  {
    icon: Kanban,
    title: "Pipeline that updates itself",
    desc: "Deals move as conversations progress. No manual CRM entry.",
  },
  {
    icon: Users,
    title: "Team-ready from day one",
    desc: "Assign threads, add notes, and follow up without chaos.",
  },
  {
    icon: Shield,
    title: "Built for Indian SMBs",
    desc: "INR billing, encrypted tokens, role-based access.",
  },
];

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromAgency = searchParams.get("from") === "agency";
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const dismissOnboarding = useAuthStore((s) => s.dismissOnboarding);

  function goToDashboard() {
    dismissOnboarding();
    router.push(fromAgency ? "/dashboard/agency" : "/dashboard");
  }

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

  const stepperSteps = [
    { id: "account", label: "Workspace", done: true, current: false },
    { id: "whatsapp", label: "Connect", done: whatsappConnected, current: !whatsappConnected },
    {
      id: "live",
      label: "Go live",
      done: firstMessageReceived,
      current: whatsappConnected && !firstMessageReceived,
    },
  ];

  const progressPct = Math.round(
    ((stepperSteps.filter((s) => s.done).length + (whatsappConnected && !firstMessageReceived ? 0.5 : 0)) /
      stepperSteps.length) *
      100,
  );

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Logo href="/dashboard" />
          <div className="hidden flex-1 justify-center md:flex">
            <OnboardingStepper steps={stepperSteps} />
          </div>
          <div className="flex items-center gap-2">
            {fromAgency ? (
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href="/dashboard/agency">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Agency</span>
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              </Button>
            )}
            {whatsappConnected ? (
              fromAgency ? (
                <Button size="sm" className="rounded-xl" onClick={goToDashboard}>
                  Back to agency
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={() => router.push("/dashboard/inbox")}
                >
                  Open Conversations
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )
            ) : (
              <Button variant="outline" size="sm" className="rounded-xl" onClick={goToDashboard}>
                {fromAgency ? "Back to agency" : "Skip for now"}
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-border/40 px-5 py-2.5 md:hidden">
          <OnboardingStepper steps={stepperSteps} className="justify-center" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        {fromAgency && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-[#dce9ff] bg-white px-4 py-3.5 shadow-sm">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs font-bold">
              A
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Setting up WhatsApp for{" "}
              <strong className="text-foreground">{organization?.name ?? "this client"}</strong>.
              Complete go-live here, then return to Agency clients to monitor portfolio health.
            </p>
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
          {/* Primary column */}
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                {whatsappConnected ? "Almost there" : "Step 2 of 3"}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0b1c30] sm:text-3xl">
                {whatsappConnected
                  ? "Confirm your WhatsApp is live"
                  : `${timeGreeting(user?.name).replace(/[!?.]+$/, "")} — connect WhatsApp`}
              </h1>
              <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                {whatsappConnected
                  ? "Send a test message, verify AI classification, and unlock Conversations + Pipeline."
                  : "Link the business number your customers already use. Growvisi classifies messages and tracks revenue — your team replies when it matters."}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="h-1.5 flex-1 max-w-xs overflow-hidden rounded-full bg-border">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-[#128C7E]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(progressPct, whatsappConnected ? 66 : 33)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                  {Math.max(progressPct, whatsappConnected ? 66 : 33)}%
                </span>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {!whatsappConnected ? (
                <motion.div
                  key="connect"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <WhatsappConnect variant="onboarding" />
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Not ready?{" "}
                    <button
                      type="button"
                      className="font-medium text-accent hover:underline"
                      onClick={goToDashboard}
                    >
                      Explore dashboard first
                    </button>
                    <span className="hidden sm:inline"> — connect anytime from Connection settings.</span>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="connected"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-4 rounded-2xl border border-[#6cf8bb]/40 bg-white p-5 shadow-[0_8px_30px_rgb(11_28_48/0.04)]">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#128C7E]">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0b1c30]">WhatsApp connected</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {activeAccount?.verifiedName ?? "Business line"}
                        {activeAccount?.displayPhoneNumber
                          ? ` · ${activeAccount.displayPhoneNumber}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {activeAccount?.displayPhoneNumber && <WhatsappGoLiveChecklist />}
                  <WhatsappOnboardingFaq />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-[0_8px_30px_rgb(11_28_48/0.04)]">
              <p className="text-sm font-bold text-[#0b1c30]">What Growvisi does</p>
              <ul className="mt-4 space-y-4">
                {VALUE_PROPS.map((vp) => (
                  <li key={vp.title} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ecfdf5] text-accent">
                      <vp.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{vp.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{vp.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border/60 bg-white p-5">
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-accent" />
                <p className="text-sm font-bold text-[#0b1c30]">After you connect</p>
              </div>
              <ol className="mt-4 space-y-3">
                {[
                  "Customer messages your WhatsApp number",
                  "AI classifies intent and scores the lead",
                  "Deal appears in Pipeline automatically",
                  "Your team replies — Growvisi never auto-replies",
                ].map((text, i) => (
                  <li key={text} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[11px] font-bold text-[#0b1c30]">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-snug">{text}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="overflow-hidden rounded-2xl bg-[#0b1c30] p-5 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
                14-day free trial
              </p>
              <p className="mt-2 text-lg font-bold">No credit card required</p>
              <p className="mt-1 text-sm text-white/65">From ₹999/mo after trial · Cancel anytime</p>
            </div>

            <WhatsappOnboardingHelp compact />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]" aria-busy="true">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <OnboardingPageContent />
    </Suspense>
  );
}
