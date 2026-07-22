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
  const maybeClient = getSupabaseClient();
  if (!maybeClient) {
    onConnected(false);
    return () => undefined;
  }
  const client = maybeClient;

  let channel: RealtimeChannel | null = null;
  let destroyed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function createChannel() {
    if (destroyed) return;
    channel = client
      .channel(`org:${organizationId}`)
      .on("broadcast", { event: "message.new" }, ({ payload }) => {
        handleRealtimeEvent(queryClient, "message.new", payload as RealtimeRefreshPayload);
      })
      .on("broadcast", { event: "inbox.updated" }, ({ payload }) => {
        handleRealtimeEvent(queryClient, "inbox.updated", payload as { conversationId?: string });
      })
      .on("broadcast", { event: "message.status.updated" }, ({ payload }) => {
        handleRealtimeEvent(
          queryClient,
          "message.status.updated",
          payload as RealtimeRefreshPayload,
        );
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
        if (destroyed) return;
        if (status === "SUBSCRIBED") {
          onConnected(true);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          onConnected(false);
          scheduleReconnect();
        }
      });
  }

  function scheduleReconnect() {
    if (destroyed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (destroyed) return;
      if (channel) void client.removeChannel(channel);
      channel = null;
      createChannel();
    }, 3_000);
  }

  createChannel();

  return () => {
    destroyed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (channel) void client.removeChannel(channel);
    onConnected(false);
  };
}
