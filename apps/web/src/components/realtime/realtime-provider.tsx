"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { organizationIdFromStore, useAuthStore } from "@/stores/auth-store";

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

/** Socket.IO is disabled on Vercel serverless API — see apps/api/src/main.ts */
function realtimeEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_REALTIME_ENABLED === "false") return false;
  if (process.env.NEXT_PUBLIC_REALTIME_ENABLED === "true") return true;
  // Default off for production API host (no WebSocket adapter on Vercel)
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
    if (!accessToken || !orgId || !realtimeEnabled()) {
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

    const refresh = (conversationId?: string) => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["conversation-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["funnel-metrics"] });
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      }
    };

    socket.on("message.new", (payload: { conversationId?: string }) => {
      refresh(payload?.conversationId);
    });

    socket.on("inbox.updated", () => {
      refresh();
    });

    socket.on("lead.stage.changed", (payload: { leadId?: string }) => {
      refresh();
      if (payload?.leadId) {
        void queryClient.invalidateQueries({ queryKey: ["lead-timeline", payload.leadId] });
      }
    });

    socket.on("lead.classified", (payload: { conversationId?: string; leadId?: string }) => {
      refresh(payload?.conversationId);
      if (payload?.leadId) {
        void queryClient.invalidateQueries({ queryKey: ["lead-timeline", payload.leadId] });
      }
    });

    socket.on("lead.handoff", (payload: { conversationId?: string }) => {
      refresh(payload?.conversationId);
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
