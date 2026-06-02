"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface ConversationRow {
  id: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
  lastMessageAt: string | null;
  lead: { stage: string } | null;
  messages: Array<{ content: string | null }>;
}

export default function InboxPage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      apiFetch<{ data: ConversationRow[] }>("/conversations?pageSize=50", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  return (
    <div className="flex h-screen">
      <div className="w-96 border-r border-border p-4">
        <h1 className="mb-4 text-xl font-bold">Team Inbox</h1>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        <div className="space-y-2">
          {data?.data.map((c) => (
            <Card
              key={c.id}
              className={cn("cursor-pointer transition-colors hover:border-primary/50", c.unreadCount > 0 && "border-primary/30")}
            >
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <p className="font-medium">{c.contactName ?? c.contactPhone}</p>
                  {c.unreadCount > 0 && (
                    <span className="rounded-full bg-primary px-2 text-xs">{c.unreadCount}</span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {c.messages[0]?.content ?? "No messages"}
                </p>
                {c.lead && (
                  <span className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-[10px] uppercase">
                    {c.lead.stage}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
          {!isLoading && data?.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No conversations yet. Connect WhatsApp.</p>
          )}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Select a conversation
      </div>
    </div>
  );
}
