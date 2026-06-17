"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Building2, LogOut, Mail, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logout } from "@/lib/auth-session";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";

const WhatsappConnect = dynamic(() => import("@/components/settings/whatsapp-connect"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-8 text-sm text-muted-foreground">
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
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <PageHeader
        title="Settings"
        description="Manage your workspace, WhatsApp connection, and account"
      />

      <div className="space-y-8">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Workspace
            </h2>
          </div>
          <Card>
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
        </section>

        <section id="whatsapp">
          <div className="mb-4 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-[#128C7E]" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              WhatsApp
            </h2>
          </div>
          <WhatsappConnect />
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Account
            </h2>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{user?.name ?? "Your account"}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" asChild>
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
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
