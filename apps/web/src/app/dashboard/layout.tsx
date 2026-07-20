import { cookies } from "next/headers";
import { DashboardLayoutClient } from "./dashboard-layout-client";
import { fetchShellBootstrapServer } from "@/lib/shell-bootstrap-server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const initialShell = await fetchShellBootstrapServer(cookieHeader);

  return (
    <DashboardLayoutClient initialShell={initialShell}>{children}</DashboardLayoutClient>
  );
}
