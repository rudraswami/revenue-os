import { GrowvisiLogoLoader } from "@/components/ui/loading/growvisi-logo-loader";

export function LoadingScreen({ message = "Loading your workspace…" }: { message?: string }) {
  return <GrowvisiLogoLoader fullscreen size="lg" message={message} />;
}
