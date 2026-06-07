export function LoadingScreen({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path
            d="M8 14.5C8 11.46 10.46 9 13.5 9h1C17.54 9 20 11.46 20 14.5v3.5a1 1 0 01-1 1h-1.2a.8.8 0 01-.8-.8V16.2a2.2 2.2 0 00-2.2-2.2h-.6a2.2 2.2 0 00-2.2 2.2v2.2a.8.8 0 01-.8.8H9a1 1 0 01-1-1v-3.5z"
            fill="white"
          />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
