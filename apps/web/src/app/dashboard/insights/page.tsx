import { redirect } from "next/navigation";

/** Insights merged into Home — recommendations section */
export default function InsightsRedirectPage() {
  redirect("/dashboard#recommendations");
}
