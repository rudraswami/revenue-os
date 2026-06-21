"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Building2, Loader2, LogOut, Mail, MessageCircle, Users } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";
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
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);

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
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-dashed border-[#dce9ff] bg-[#f8f9ff] p-4">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Team & billing</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Invite teammates and manage plans — coming soon.{" "}
                  <Link href="/contact" className="font-medium text-accent hover:underline">
                    Contact us
                  </Link>{" "}
                  for Enterprise.
                </p>
              </div>
            </div>
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

        <DashboardSection title="Account" description="Profile and data controls." icon={Mail}>
          <DashboardPanel delay={0.1}>
            <p className="text-base font-bold">{user?.name ?? "Your account"}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{user?.email}</p>
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
                <Link href="/data-deletion" className="underline hover:text-foreground">
                  Data deletion
                </Link>
              </p>
              <DeleteAccountCard />
            </div>
          </DashboardPanel>
        </DashboardSection>
      </div>
    </div>
  );
}
