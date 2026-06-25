"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  Inbox,
  Kanban,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { Button } from "@/components/ui/button";
import WhatsappConnect from "@/components/settings/whatsapp-connect";
import { WhatsappIngestionVerifier } from "@/components/settings/whatsapp-ingestion-verifier";
import { WhatsappOnboardingFaq } from "@/components/settings/whatsapp-onboarding-faq";
import { WhatsappOnboardingHelp } from "@/components/settings/whatsapp-onboarding-help";
import { apiFetch } from "@/lib/api-client";
import { timeGreeting } from "@/lib/greeting";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const VALUE_PROPS = [
  { icon: Bot, title: "AI classifies every message", desc: "Intent, sentiment, and pipeline stage — automatically." },
  { icon: Kanban, title: "Revenue pipeline", desc: "Kanban board that updates as AI processes conversations." },
  { icon: Users, title: "Team collaboration", desc: "Assign leads, add notes, create tasks for your team." },
  { icon: Shield, title: "Enterprise security", desc: "Role-based access, encrypted tokens, audit trail." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const dismissOnboarding = useAuthStore((s) => s.dismissOnboarding);
  const [activeStep, setActiveStep] = useState(2);

  function goToDashboard() {
    dismissOnboarding();
    router.push("/dashboard");
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
      setActiveStep(3);
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
      description: "Conversations, Pipeline, Contacts, and Insights are ready.",
    },
    {
      id: "whatsapp",
      title: "Connect your WhatsApp number",
      done: whatsappConnected,
      description: "Continue with Facebook or paste a token from Meta API Setup.",
    },
    {
      id: "inbox",
      title: "Receive your first customer message",
      done: firstMessageReceived,
      description: "Send a WhatsApp message to your business number to verify ingestion.",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="min-h-screen surface-lavender">
      <header className="border-b border-border/80 bg-white/90 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
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
                Open conversations
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={goToDashboard}>
                Skip for now
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Main content */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 overflow-hidden rounded-2xl border border-border/80 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                    {timeGreeting(user?.name)}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Set up takes about 2 minutes. You can explore the dashboard anytime.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-[12px] font-medium text-muted-foreground">
                  <span>Setup progress</span>
                  <span className="font-bold text-accent">{progress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-border">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-[#128C7E]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Steps */}
            <ol className="mb-10 space-y-3">
              {steps.map((step, i) => (
                <motion.li
                  key={step.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-all duration-200",
                    step.done
                      ? "border-success/30 bg-success/5 shadow-sm"
                      : activeStep === i
                        ? "border-accent/30 bg-accent/5 shadow-md ring-1 ring-accent/10"
                        : "border-border/80 bg-white shadow-sm hover:border-primary/20",
                  )}
                  onClick={() => !step.done && setActiveStep(i)}
                >
                  <div className="flex gap-4">
                    <div className="mt-0.5 shrink-0">
                      {step.done ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : activeStep === i ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-accent">
                          <div className="h-2 w-2 rounded-full bg-accent" />
                        </div>
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Step {i + 1}
                        </p>
                        {step.done && (
                          <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-success">
                            Done
                          </span>
                        )}
                      </div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ol>

            <AnimatePresence mode="wait">
              {!whatsappConnected ? (
                <motion.div
                  key="connect"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
                  <WhatsappConnect />
                  <WhatsappOnboardingHelp />
                  <p className="text-center text-sm text-muted-foreground">
                    Not ready yet?{" "}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={goToDashboard}
                    >
                      Go to dashboard
                    </button>{" "}
                    — you can connect WhatsApp anytime from Settings.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="connected"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="space-y-6"
                >
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Value preview sidebar */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-8 space-y-4"
            >
              <div className="rounded-2xl border border-accent/20 bg-gradient-to-b from-bento-mint/50 to-white p-5">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <p className="text-sm font-bold">What you&apos;ll unlock</p>
                </div>
                <div className="mt-4 space-y-4">
                  {VALUE_PROPS.map((vp, i) => (
                    <motion.div
                      key={vp.title}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      className="flex gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <vp.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{vp.title}</p>
                        <p className="text-xs text-muted-foreground">{vp.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-5">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-bold">What happens next</p>
                </div>
                <ol className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">1</span>
                    Customer sends a WhatsApp message
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">2</span>
                    AI classifies intent, scores the lead
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">3</span>
                    Lead appears in your pipeline
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">4</span>
                    Your team acts — assign, tag, close
                  </li>
                </ol>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-[#0b1c30] to-[#006c49] p-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/70">14-day free trial</p>
                <p className="mt-2 text-sm font-bold">No credit card required</p>
                <p className="mt-1 text-xs text-white/70">
                  Starts at ₹999/mo after trial. Cancel anytime.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
