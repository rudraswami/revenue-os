import { GrowvisiLogoLoader } from "@/components/ui/loading";

export default function ConnectLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true" aria-label="Loading">
      <GrowvisiLogoLoader size="md" />
    </div>
  );
}
