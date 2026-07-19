import { redirect } from "next/navigation";

/** Intelligence page removed — legacy links redirect to Analytics. */
export default function AiRedirectPage() {
  redirect("/dashboard/analytics");
}
