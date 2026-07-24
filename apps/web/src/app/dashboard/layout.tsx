import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { DashboardLayoutClient } from "./dashboard-layout-client";
import { fetchShellBootstrapServer } from "@/lib/shell-bootstrap-server";
import { hostFromRequestHeaders } from "@/lib/growvisi-host";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: "Dashboard — Growvisi",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const requestHost = hostFromRequestHeaders(await headers());

  // Do NOT await — start the shell-bootstrap fetch and stream the promise to the
  // client. The app shell paints immediately (from persisted React Query cache
  // for returning users); the server seed fills/refreshes the cache when it
  // resolves. This removes the serial cross-region blocking fetch from TTFB.
  const initialShellPromise = fetchShellBootstrapServer(cookieHeader, requestHost);

  return (
    <DashboardLayoutClient initialShellPromise={initialShellPromise}>
      {children}
    </DashboardLayoutClient>
  );
}
