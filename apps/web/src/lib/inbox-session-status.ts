export function messagingWindowRemainingMs(lastInboundAt: string | null | undefined): number {
  if (!lastInboundAt) return 0;
  const last = new Date(lastInboundAt).getTime();
  if (Number.isNaN(last)) return 0;
  const remaining = 24 * 60 * 60 * 1000 - (Date.now() - last);
  return Math.max(0, remaining);
}

export function isMessagingWindowOpen(lastInboundAt: string | null | undefined): boolean {
  return messagingWindowRemainingMs(lastInboundAt) > 0;
}

export function formatSessionTimeLeft(ms: number, locale: string): string {
  if (ms <= 0) return "";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (locale === "hi") {
    if (hours > 0) return `${hours}घं ${minutes}मि बचे`;
    return `${minutes} मिनट बचे`;
  }
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
