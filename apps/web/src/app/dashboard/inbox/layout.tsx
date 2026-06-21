/** Full-height workspace — main column scroll is disabled in DashboardShell for this route. */
export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return <div className="inbox-workspace flex min-h-0 flex-1 flex-col">{children}</div>;
}
