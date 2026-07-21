import { cookies } from "next/headers";
import { DashboardLayoutClient } from "./dashboard-layout-client";
import { fetchShellBootstrapServer } from "@/lib/shell-bootstrap-server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Do NOT await — start the shell-bootstrap fetch and stream the promise to the
  // client. The app shell paints immediately (from persisted React Query cache
  // for returning users); the server seed fills/refreshes the cache when it
  // resolves. This removes the serial cross-region blocking fetch from TTFB.
  const initialShellPromise = fetchShellBootstrapServer(cookieHeader);

  return (
    <DashboardLayoutClient initialShellPromise={initialShellPromise}>
      {children}
    </DashboardLayoutClient>
  );
}
