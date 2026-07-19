import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-config";

export interface RealtimeRefreshPayload {
  conversationId?: string;
  leadId?: string;
}

/** Targeted invalidation — prefer narrow keys over blanket refetch storms. */
export function handleRealtimeEvent(
  queryClient: QueryClient,
  event: string,
  payload: RealtimeRefreshPayload = {},
): void {
  const { conversationId, leadId } = payload;

  switch (event) {
    case "message.new":
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversationQueueStats });
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      }
      break;
    case "inbox.updated":
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversationQueueStats });
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      }
      break;
    case "lead.stage.changed":
    case "lead.classified":
    case "lead.handoff":
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversationQueueStats });
      if (conversationId) {
        void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      }
      if (leadId) {
        void queryClient.invalidateQueries({ queryKey: ["lead-timeline", leadId] });
      }
      break;
    case "whatsapp.setup.updated":
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.shellBootstrap });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.whatsappAccounts });
      break;
    default:
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversationQueueStats });
  }
}
