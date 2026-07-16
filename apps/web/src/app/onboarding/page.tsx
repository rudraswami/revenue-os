"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { ActivationSuccess } from "@/components/onboarding/activation-success";
import { ConnectionProgress } from "@/components/onboarding/connection-progress";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { OnboardingWelcome } from "@/components/onboarding/onboarding-welcome";
import { Button } from "@/components/ui/button";
import WhatsappConnect, {
  type WhatsappConnectPhase,
} from "@/components/settings/whatsapp-connect";
import { useI18n } from "@/lib/i18n/locale-provider";
import { apiFetch } from "@/lib/api-client";
import { trackActivation } from "@/lib/activation-analytics";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type Screen = "welcome" | "connect" | "connecting" | "success";

function OnboardingPageContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromAgency = searchParams.get("from") === "agency";
  const token = useAuthStore((s) => s.accessToken);
  const organization = useAuthStore((s) => s.organization);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const dismissOnboarding = useAuthStore((s) => s.dismissOnboarding);

  const [screen, setScreen] = useState<Screen>("welcome");
  const [connectPhase, setConnectPhase] = useState<WhatsappConnectPhase>("idle");
  const connectPhaseRef = useRef<WhatsappConnectPhase>("idle");
  /** Once true, keep WhatsappConnect mounted for the rest of the session so ES cannot remount mid-popup. */
  const [connectMounted, setConnectMounted] = useState(false);
  const connectViewTracked = useRef(false);

  function exploreDashboard() {
    trackActivation("onboarding_welcome_skip");
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
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const whatsappConnected = accounts?.some((a) => a.isActive) ?? false;
  const activeAccount = accounts?.find((a) => a.isActive);
  const esInFlight = connectPhase === "waiting_meta" || connectPhase === "saving";

  useEffect(() => {
    if (!whatsappConnected) return;
    // Never yank UI away while Meta popup / complete API is still running.
    if (esInFlight) return;
    patchOnboarding({
      whatsappConnected: true,
      firstMessageReceived: false,
      // Activation complete only after first inbound (Success first-win coach).
      complete: false,
    });
    setScreen("success");
    setConnectPhase((p) => (p === "done" ? p : "done"));
  }, [whatsappConnected, esInFlight, patchOnboarding]);

  function handlePhaseChange(phase: WhatsappConnectPhase) {
    const prev = connectPhaseRef.current;
    connectPhaseRef.current = phase;
    setConnectPhase(phase);

    if (phase === "waiting_meta") {
      trackActivation("onboarding_meta_started");
    } else if (phase === "error") {
      trackActivation("onboarding_meta_failed");
    } else if (phase === "idle" && (prev === "waiting_meta" || prev === "saving")) {
      trackActivation("onboarding_meta_cancelled");
    }

    if (phase === "waiting_meta" || phase === "saving") {
      setScreen("connecting");
    } else if (phase === "error" || phase === "idle") {
      setScreen("connect");
    } else if (phase === "done") {
      setScreen("success");
    }
  }

  function enterConnect() {
    setConnectMounted(true);
    setScreen("connect");
  }

  useEffect(() => {
    if (screen === "connect" && connectMounted && !connectViewTracked.current) {
      connectViewTracked.current = true;
      trackActivation("onboarding_connect_view");
    }
  }, [screen, connectMounted]);

  const activeScreen: Screen =
    whatsappConnected && !esInFlight ? "success" : screen;

  const stepperSteps = [
    {
      id: "welcome",
      label: t("onboardingActivation.stepWelcome"),
      done: activeScreen !== "welcome",
      current: activeScreen === "welcome",
    },
    {
      id: "connect",
      label: t("onboardingActivation.stepConnect"),
      done: activeScreen === "success",
      current: activeScreen === "connect" || activeScreen === "connecting",
    },
    {
      id: "ready",
      label: t("onboardingActivation.stepReady"),
      done: activeScreen === "success",
      current: activeScreen === "success",
    },
  ];

  const hideConnectUi =
    activeScreen === "connecting" ||
    activeScreen === "success" ||
    activeScreen === "welcome";

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Logo href="/dashboard" />
          <div className="hidden flex-1 justify-center sm:flex">
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
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={exploreDashboard}
                disabled={esInFlight}
              >
                {t("onboardingActivation.exploreDashboard")}
              </Button>
            )}
          </div>
        </div>
        <div className="border-t border-border/40 px-5 py-2.5 sm:hidden">
          <OnboardingStepper steps={stepperSteps} className="justify-center" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        {fromAgency && activeScreen !== "success" && (
          <div className="mb-8 rounded-2xl border border-[#dce9ff] bg-white px-4 py-3.5 text-sm text-muted-foreground shadow-sm">
            {t("onboardingActivation.agencyBanner")}{" "}
            <strong className="text-foreground">{organization?.name ?? "this client"}</strong>
          </div>
        )}

        <AnimatePresence mode="sync">
          {activeScreen === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <OnboardingWelcome onContinue={enterConnect} onExplore={exploreDashboard} />
            </motion.div>
          )}

          {activeScreen === "connecting" &&
            (connectPhase === "waiting_meta" || connectPhase === "saving") && (
              <motion.div
                key="connecting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <ConnectionProgress phase={connectPhase} />
              </motion.div>
            )}

          {activeScreen === "connect" && (
            <motion.div
              key="connect-copy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto max-w-lg"
            >
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30] sm:text-3xl">
                  {t("onboardingActivation.connectHeadline")}
                </h1>
                <p className="mt-3 text-base text-muted-foreground">
                  {t("onboardingActivation.connectSub")}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {t("onboardingActivation.connectDiff")}
                </p>
              </div>
            </motion.div>
          )}

          {activeScreen === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ActivationSuccess
                businessName={
                  activeAccount?.verifiedName ??
                  organization?.name ??
                  t("onboardingActivation.yourBusiness")
                }
                phoneNumber={activeAccount?.displayPhoneNumber}
                onOpenInbox={() => {
                  dismissOnboarding();
                  router.push("/dashboard/inbox");
                }}
                onExploreDashboard={exploreDashboard}
                showAgencyReturn={fromAgency}
                onAgencyReturn={exploreDashboard}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/*
          Single stable mount for Embedded Signup. Must stay alive from Continue → Meta popup
          → complete API so FB.login + WA_EMBEDDED_SIGNUP postMessage are never torn down.
        */}
        {connectMounted && (
          <div
            className={cn("mx-auto max-w-lg", hideConnectUi && "sr-only")}
            aria-hidden={hideConnectUi}
          >
            <WhatsappConnect variant="onboarding" onPhaseChange={handlePhaseChange} />
          </div>
        )}
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
