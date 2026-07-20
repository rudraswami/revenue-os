"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { handleRealtimeEvent, type RealtimeRefreshPayload } from "@/lib/realtime-event-handler";
import { organizationIdFromStore, useAuthStore } from "@/stores/auth-store";
import { subscribeSupabaseOrgChannel, supabaseRealtimeEnabled } from "@/lib/supabase-realtime";

interface RealtimeContextValue {
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({ connected: false });

export function useRealtime() {
  return useContext(RealtimeContext);
}

function wsBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_WS_URL ?? "http://127.0.0.1:4000")
    .replace(/\\r\\n/g, "")
    .replace(/[\r\n]+/g, "")
    .trim();
  return raw.replace(/\/$/, "");
}

/** Socket.IO when API runs with native WebSocket (local / dedicated host). */
function socketRealtimeEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_REALTIME_ENABLED === "false") return false;
  if (process.env.NEXT_PUBLIC_REALTIME_ENABLED === "true") return true;
  const base = wsBaseUrl();
  return !base.includes("growvisi.in") && !base.includes("vercel.app");
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const organizationId = useAuthStore((s) => s.organization?.id);
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const orgId = organizationId ?? organizationIdFromStore();
    if (!accessToken || !orgId) {
      setConnected(false);
      return;
    }

    if (supabaseRealtimeEnabled()) {
      return subscribeSupabaseOrgChannel(orgId, queryClient, setConnected);
    }

    if (!socketRealtimeEnabled()) {
      setConnected(false);
      return;
    }

    const socket: Socket = io(`${wsBaseUrl()}/realtime`, {
      auth: { token: accessToken },
      transports: ["polling", "websocket"],
      reconnectionAttempts: 3,
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    socket.on("message.new", (payload: RealtimeRefreshPayload) => {
      handleRealtimeEvent(queryClient, "message.new", payload);
    });

    socket.on("lead.classified", (payload: { conversationId?: string; leadId?: string }) => {
      handleRealtimeEvent(queryClient, "lead.classified", payload);
    });

    socket.on("inbox.updated", (payload: { conversationId?: string }) => {
      handleRealtimeEvent(queryClient, "inbox.updated", payload);
    });

    socket.on("lead.stage.changed", (payload: { leadId?: string }) => {
      handleRealtimeEvent(queryClient, "lead.stage.changed", payload);
    });

    socket.on("lead.handoff", (payload: { conversationId?: string; leadId?: string }) => {
      handleRealtimeEvent(queryClient, "lead.handoff", payload);
    });

    socket.on("whatsapp.setup.updated", () => {
      handleRealtimeEvent(queryClient, "whatsapp.setup.updated");
    });

    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [accessToken, organizationId, queryClient]);

  return (
    <RealtimeContext.Provider value={{ connected }}>{children}</RealtimeContext.Provider>
  );
}
