import type { QueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query-config";
import { getActiveInboxConversationId } from "@/lib/inbox-active-thread";
import { invalidateInboxThreadQueries } from "@/lib/inbox-thread-bundle";
import { invalidateWorkspaceShellCache } from "@/lib/session-query-cache";
import {
  handleMessageNewCacheUpdate,
  patchLeadStageInCaches,
  patchThreadMessageStatus,
  refreshConversationLists,
  refreshQueueStats,
  type MessageNewRealtimePayload,
} from "@/lib/realtime-inbox-cache";

export interface RealtimeRefreshPayload {
  conversationId?: string;
  leadId?: string;
  toStage?: string;
  messageId?: string;
  direction?: "INBOUND" | "OUTBOUND";
  content?: string | null;
  createdAt?: string;
  type?: string;
  status?: string;
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
      // Targeted cache patch already updates list + unread stats (see
      // handleMessageNewCacheUpdate). Avoid a blanket stats invalidation on
      // every message — queue re-categorization arrives via lead.* events.
      if (payload.conversationId) {
        handleMessageNewCacheUpdate(
          queryClient,
          payload as MessageNewRealtimePayload,
          { activeConversationId },
        );
      }
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
    case "message.status.updated":
      // Patch ticks in place. If the message isn't in cache (thread closed or
      // not loaded), do nothing — status reconciles on next open/poll.
      if (conversationId && payload.messageId && payload.status) {
        patchThreadMessageStatus(queryClient, {
          conversationId,
          messageId: payload.messageId,
          status: payload.status,
        });
      }
      break;
    case "lead.stage.changed":
    case "lead.classified":
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      refreshQueueStats(queryClient);
      if (conversationId) {
        invalidateInboxThreadQueries(queryClient, conversationId);
      } else if (leadId && payload.toStage) {
        patchLeadStageInCaches(queryClient, leadId, payload.toStage);
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
