import type { Metadata } from "next";
import { LandingV2Hero } from "@/components/landing-v2/sections/hero";
import { LandingV2Nav } from "@/components/landing-v2/nav";

export const metadata: Metadata = {
  title: "Landing V2 — Growvisi",
  description: "Hero exploration — The Handoff",
  robots: { index: false, follow: false },
};

export default function LandingV2Page() {
  return (
    <div className="min-h-screen bg-background">
      <LandingV2Nav />
      <main>
        <LandingV2Hero />
      </main>
    </div>
  );
}
