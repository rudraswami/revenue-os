"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";
import { handleRealtimeEvent, type RealtimeRefreshPayload } from "@/lib/realtime-event-handler";

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  supabaseClient = createClient(url, key, { auth: { persistSession: false } });
  return supabaseClient;
}

export function supabaseRealtimeEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_REALTIME_ENABLED === "false") return false;
  if (process.env.NEXT_PUBLIC_REALTIME_ENABLED === "true") return true;
  return getSupabaseClient() != null;
}

export function subscribeSupabaseOrgChannel(
  organizationId: string,
  queryClient: QueryClient,
  onConnected: (connected: boolean) => void,
): () => void {
  const client = getSupabaseClient();
  if (!client) {
    onConnected(false);
    return () => undefined;
  }

  let channel: RealtimeChannel | null = null;

  channel = client
    .channel(`org:${organizationId}`)
    .on("broadcast", { event: "message.new" }, ({ payload }) => {
      handleRealtimeEvent(queryClient, "message.new", payload as RealtimeRefreshPayload);
    })
    .on("broadcast", { event: "inbox.updated" }, ({ payload }) => {
      handleRealtimeEvent(queryClient, "inbox.updated", payload as { conversationId?: string });
    })
    .on("broadcast", { event: "lead.stage.changed" }, ({ payload }) => {
      handleRealtimeEvent(queryClient, "lead.stage.changed", payload as { leadId?: string });
    })
    .on("broadcast", { event: "lead.classified" }, ({ payload }) => {
      handleRealtimeEvent(
        queryClient,
        "lead.classified",
        payload as { conversationId?: string; leadId?: string },
      );
    })
    .on("broadcast", { event: "lead.handoff" }, ({ payload }) => {
      handleRealtimeEvent(
        queryClient,
        "lead.handoff",
        payload as { conversationId?: string; leadId?: string },
      );
    })
    .on("broadcast", { event: "whatsapp.setup.updated" }, () => {
      handleRealtimeEvent(queryClient, "whatsapp.setup.updated");
    })
    .subscribe((status) => {
      onConnected(status === "SUBSCRIBED");
    });

  return () => {
    if (channel) {
      void client.removeChannel(channel);
    }
    onConnected(false);
  };
}
