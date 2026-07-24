import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = {
  ...NOINDEX_METADATA,
  title: "Data deletion status — Growvisi",
};

export default function DataDeletionStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
