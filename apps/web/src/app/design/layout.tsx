import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: "Design system — Growvisi",
};

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
