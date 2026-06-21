"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect } from "react";
import { Building2, BookOpen, CreditCard, Key, Loader2, LogOut, Mail, MessageCircle, User } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { ApiKeysSettingsCard } from "@/components/settings/api-keys-settings-card";
import { BusinessContextCard } from "@/components/settings/business-context-card";
import { BillingSettingsCard } from "@/components/settings/billing-settings-card";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";
import { ProfileSettingsCard } from "@/components/settings/profile-settings-card";
import { ReplyTemplatesCard } from "@/components/settings/reply-templates-card";
import { TeamMembersCard } from "@/components/settings/team-members-card";
import { logout } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

const WhatsappConnect = dynamic(() => import("@/components/settings/whatsapp-connect"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 rounded-2xl border border-[#dce9ff] bg-[#f8f9ff] p-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-accent" />
      Loading WhatsApp settings…
    </div>
  ),
});

export default function SettingsPage() {
  const router = useRouter();
  const organization = useAuthStore((s) => s.organization);

  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="dashboard-page max-w-3xl">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="WhatsApp connection, workspace profile, and account controls."
      />

      <div className="space-y-10">
        <DashboardSection
          title="Workspace"
          description="Your organization on Growvisi."
          icon={Building2}
        >
          <DashboardPanel delay={0.05}>
            <p className="text-base font-bold">{organization?.name ?? "Your workspace"}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{organization?.slug}</p>
            <TeamMembersCard />
          </DashboardPanel>
        </DashboardSection>

        <DashboardSection
          id="billing"
          title="Billing"
          description="Your current plan — view all plans on the pricing page."
          icon={CreditCard}
        >
          <DashboardPanel delay={0.07}>
            <BillingSettingsCard />
            <Button variant="outline" size="sm" asChild className="mt-4 rounded-xl">
              <Link href="/dashboard/pricing">View all plans</Link>
            </Button>
          </DashboardPanel>
        </DashboardSection>

        <DashboardSection
          title="Business context"
          description="Product and policy notes for your sales team."
          icon={BookOpen}
        >
          <DashboardPanel delay={0.09}>
            <BusinessContextCard />
          </DashboardPanel>
        </DashboardSection>

        <DashboardSection
          title="Quick replies"
          description="Templates your team can use in Conversations."
          icon={Mail}
        >
          <DashboardPanel delay={0.08}>
            <ReplyTemplatesCard />
          </DashboardPanel>
        </DashboardSection>

        <DashboardSection
          id="whatsapp"
          title="WhatsApp"
          description="Your business line, connection health, and Meta access token."
          icon={MessageCircle}
          iconClassName="bg-[#ecfdf5] text-[#128C7E]"
        >
          <WhatsappConnect />
        </DashboardSection>

        <DashboardSection title="Account" description="Profile and data controls." icon={User}>
          <DashboardPanel delay={0.1}>
            <ProfileSettingsCard />
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" asChild className="rounded-xl">
                <Link href="/onboarding">Guided WhatsApp setup</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-muted-foreground"
                onClick={() => void handleLogout()}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
            <div className="mt-6 border-t border-[#dce9ff] pt-5">
              <p className="mb-3 text-xs text-muted-foreground">
                <Link href="/privacy" className="underline hover:text-foreground">
                  Privacy
                </Link>
                {" · "}
                <Link href="/terms" className="underline hover:text-foreground">
                  Terms
                </Link>
                {" · "}
                <Link href="/data-deletion" className="underline hover:text-foreground">
                  Data deletion
                </Link>
                {" · "}
                <Link href="/about" className="underline hover:text-foreground">
                  How Growvisi works
                </Link>
              </p>
              <DeleteAccountCard />
            </div>
          </DashboardPanel>
        </DashboardSection>

        <DashboardSection
          title="Developer"
          description="API access for Pro workspaces."
          icon={Key}
        >
          <DashboardPanel delay={0.11}>
            <ApiKeysSettingsCard />
          </DashboardPanel>
        </DashboardSection>
      </div>
    </div>
  );
}
