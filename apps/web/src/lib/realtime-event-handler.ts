import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-config";
import { getActiveInboxConversationId } from "@/lib/inbox-active-thread";
import { invalidateInboxThreadQueries } from "@/lib/inbox-thread-bundle";
import { invalidateWorkspaceShellCache } from "@/lib/session-query-cache";
import {
  handleMessageNewCacheUpdate,
  refreshConversationLists,
  refreshQueueStats,
  type MessageNewRealtimePayload,
} from "@/lib/realtime-inbox-cache";

export interface RealtimeRefreshPayload extends MessageNewRealtimePayload {
  leadId?: string;
}

/** Targeted cache updates — never blanket-invalidate the full inbox unless unavoidable. */
export function handleRealtimeEvent(
  queryClient: QueryClient,
  event: string,
  payload: RealtimeRefreshPayload = {},
): void {
  const { conversationId, leadId } = payload;
  const activeConversationId = getActiveInboxConversationId();

  switch (event) {
    case "message.new":
      handleMessageNewCacheUpdate(queryClient, payload, { activeConversationId });
      refreshQueueStats(queryClient);
      break;
    case "inbox.updated":
      refreshQueueStats(queryClient);
      if (conversationId) {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.conversationThread(conversationId),
          refetchType: "active",
        });
      } else {
        refreshConversationLists(queryClient);
      }
      break;
    case "lead.stage.changed":
    case "lead.classified":
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      refreshQueueStats(queryClient);
      if (conversationId) {
        invalidateInboxThreadQueries(queryClient, conversationId);
      }
      if (leadId) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leadTimeline(leadId) });
      }
      break;
    case "lead.handoff":
      refreshQueueStats(queryClient);
      if (conversationId) {
        invalidateInboxThreadQueries(queryClient, conversationId);
      }
      break;
    case "whatsapp.setup.updated":
      invalidateWorkspaceShellCache(queryClient);
      break;
    default:
      refreshQueueStats(queryClient);
      if (conversationId) {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.conversationThread(conversationId),
          refetchType: "active",
        });
      }
  }
}
