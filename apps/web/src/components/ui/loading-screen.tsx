import { GrowvisiLogoLoader } from "@/components/ui/loading";

export function LoadingScreen({ message = "Loading your workspace…" }: { message?: string }) {
  return <GrowvisiLogoLoader fullscreen size="lg" message={message} />;
}
