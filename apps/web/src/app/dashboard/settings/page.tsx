"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Building2, Loader2, LogOut, Mail, MessageCircle } from "lucide-react";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";
import { logout } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

const WhatsappConnect = dynamic(() => import("@/components/settings/whatsapp-connect"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
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
        description="Manage your workspace, WhatsApp connection, and account preferences."
      />

      <div className="space-y-10">
        <DashboardSection
          title="Workspace"
          description="Your organization profile and team settings."
          icon={Building2}
        >
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{organization?.name ?? "Your workspace"}</CardTitle>
              <CardDescription>
                Slug: <span className="font-mono text-xs">{organization?.slug}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Team members and billing will live here as Growvisi grows.
              </p>
            </CardContent>
          </Card>
        </DashboardSection>

        <DashboardSection
          id="whatsapp"
          title="WhatsApp"
          description="Connect your existing business number — customers keep messaging the same line."
          icon={MessageCircle}
          iconClassName="bg-[#128C7E]/10 text-[#128C7E]"
        >
          <WhatsappConnect />
        </DashboardSection>

        <DashboardSection
          title="Account"
          description="Profile, sign out, and data controls."
          icon={Mail}
        >
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{user?.name ?? "Your account"}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" asChild className="bg-white">
                  <Link href="/onboarding">Guided WhatsApp setup</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => void handleLogout()}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  Legal:{" "}
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
            </CardContent>
          </Card>
        </DashboardSection>
      </div>
    </div>
  );
}
