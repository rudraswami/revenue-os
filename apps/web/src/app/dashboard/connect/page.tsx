import { redirect } from "next/navigation";

/** Shortcut for dashboard users — full wizard lives at /onboarding */
export default function DashboardConnectPage() {
  redirect("/onboarding");
}
