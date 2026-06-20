import Link from "next/link";
import { Sparkles } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#128C7E] via-[#25D366] to-[#1cb0c9] px-4 py-2.5 text-center text-[13px] font-medium text-white">
      <div className="pointer-events-none absolute inset-0 shimmer-line opacity-40" />
      <p className="relative flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          <Sparkles className="h-3 w-3" />
          New
        </span>
        AI lead scoring &amp; pipeline automation — connect WhatsApp in 15 minutes.{" "}
        <Link href="/register" className="font-semibold underline underline-offset-2 hover:text-white/90">
          Start free →
        </Link>
      </p>
    </div>
  );
}
