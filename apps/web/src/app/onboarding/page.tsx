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

  function exploreDashboard(from: "welcome" | "connect" | "success" = "welcome") {
    trackActivation(from === "connect" ? "onboarding_connect_later" : "onboarding_welcome_skip", {
      from,
    });
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
    connectPhaseRef.current = "done";
    setConnectPhase("done");
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
      label: t("onboardingActivation.stepWelcomeShort"),
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
      label: t("onboardingActivation.stepReadyShort"),
      done: activeScreen === "success",
      current: activeScreen === "success",
    },
  ];

  const hideConnectUi =
    activeScreen === "connecting" ||
    activeScreen === "success" ||
    activeScreen === "welcome";

  return (
    <div className="app-shell !h-auto !max-h-none min-h-screen overflow-y-auto">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto grid h-14 max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 sm:px-8">
          <div className="justify-self-start">
            <Logo href="/dashboard" />
          </div>
          <OnboardingStepper steps={stepperSteps} className="justify-self-center" />
          <div className="justify-self-end">
            {fromAgency ? (
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" asChild>
                <Link href="/dashboard/agency">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Agency</span>
                </Link>
              </Button>
            ) : (
              <span className="inline-block w-8" aria-hidden />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 sm:px-8">
        {fromAgency && activeScreen !== "success" && (
          <div className="mb-6 mt-6 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            {t("onboardingActivation.agencyBanner")}{" "}
            <strong className="text-foreground">{organization?.name ?? "this client"}</strong>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeScreen === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <OnboardingWelcome
                onContinue={enterConnect}
                onExplore={() => exploreDashboard("welcome")}
              />
            </motion.div>
          )}

          {/* Same key across Meta wait → save so the progress UI never remounts/blinks */}
          {activeScreen === "connecting" &&
            (connectPhase === "waiting_meta" || connectPhase === "saving") && (
              <motion.div
                key="connecting"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="py-14"
              >
                <ConnectionProgress phase={connectPhase} />
              </motion.div>
            )}

          {activeScreen === "connect" && (
            <motion.div
              key="connect-copy"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-md pt-14"
            >
              <div className="mb-8 text-center">
                <h1 className="display-lg text-foreground">
                  {t("onboardingActivation.connectHeadline")}
                </h1>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {t("onboardingActivation.connectSub")}
                </p>
              </div>
            </motion.div>
          )}

          {activeScreen === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="py-10"
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
                onExploreDashboard={() => exploreDashboard("success")}
                showAgencyReturn={fromAgency}
                onAgencyReturn={() => exploreDashboard("success")}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {connectMounted && (
          <div
            className={cn(
              "mx-auto max-w-md",
              hideConnectUi && "sr-only",
              activeScreen === "connect" && "-mt-2",
            )}
            aria-hidden={hideConnectUi}
          >
            <WhatsappConnect variant="onboarding" onPhaseChange={handlePhaseChange} />
          </div>
        )}

        {activeScreen === "connect" && !esInFlight && (
          <div className="mx-auto max-w-md pb-16 pt-6 text-center">
            <button
              type="button"
              className="group inline-flex flex-col items-center gap-1 text-sm transition-colors"
              onClick={() => exploreDashboard("connect")}
            >
              <span className="font-medium text-foreground/75 underline-offset-4 group-hover:text-foreground group-hover:underline">
                {t("onboardingActivation.connectLater")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("onboardingActivation.connectLaterHint")}
              </span>
            </button>
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
