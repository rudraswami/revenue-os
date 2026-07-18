import type { ReactNode } from "react";
import { MarketingAiAssistFab } from "./marketing-ai-assist-fab";
import { StickyMobileCta } from "./sticky-mobile-cta";

/** Shared marketing chrome — support dock + optional mobile CTA */
export function MarketingPageChrome({
  children,
  stickyCta = false,
}: {
  children?: ReactNode;
  stickyCta?: boolean;
}) {
  return (
    <>
      {children}
      {stickyCta ? <StickyMobileCta /> : null}
      <MarketingAiAssistFab />
    </>
  );
}
