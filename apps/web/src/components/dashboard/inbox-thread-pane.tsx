"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { Button } from "@/components/ui/button";
import { InboxCampaignAttributionBanner } from "@/components/dashboard/inbox-campaign-attribution-banner";
import { InboxThreadSkeleton } from "@/components/ui/skeleton";
import { LEAD_STAGES, STAGE_BADGE, formatInr } from "@/lib/crm";
import {
  HOT_LEAD_SCORE_THRESHOLD,
  formatRelationshipPhase,
  type LeadStage,
  type ReplyDecision,
} from "@growvisi/shared";
import { useConversationsCopy, type InboxListFilter } from "@/lib/i18n/conversations-copy";
import { InboxAiPanel, type InboxAiContext } from "@/components/dashboard/inbox-ai-panel";
import type { AssignmentExplain } from "@/lib/assignment-explain";
import { trackCoaching } from "@/lib/coaching-analytics";
import { InboxImageLightbox } from "@/components/dashboard/inbox-image-lightbox";
import { InboxHandoffPackageDialog } from "@/components/dashboard/inbox-handoff-package-dialog";
import { InboxFollowUpDialog } from "@/components/dashboard/inbox-follow-up-dialog";
import { InboxPaymentAssistBanner } from "@/components/dashboard/inbox-payment-assist-banner";
import { InboxSessionStatus } from "@/components/dashboard/inbox-session-status";
import { InboxTypingIndicator } from "@/components/dashboard/inbox-typing-indicator";
import { InboxComposer } from "@/components/dashboard/inbox-composer";
import { InboxOwnershipStrip } from "@/components/dashboard/inbox-ownership-strip";
import { InboxHandlingBar } from "@/components/dashboard/inbox-handling-bar";
import { InboxReplyDecision } from "@/components/dashboard/inbox-reply-decision";
import { InboxTimeline } from "@/components/dashboard/inbox-timeline";
import { LostReasonDialog } from "@/components/dashboard/lost-reason-dialog";
import { WonReasonDialog } from "@/components/dashboard/won-reason-dialog";
import { InboxThreadDetailsMobile } from "@/components/dashboard/inbox-thread-details-mobile";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { apiFetch, apiUpload, apiDownload, toUserMessage } from "@/lib/api-client";
import { measureInteraction, startInteraction } from "@/lib/performance";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import {
  useShellConversationCapabilities,
  useShellOnboardingCoaching,
} from "@/hooks/use-shell-data";
import { useToast } from "@/components/ui/toast";
import { useVisibleRefetchInterval } from "@/hooks/use-visible-refetch-interval";
import { useInboxThreadKeyboard } from "@/hooks/use-inbox-thread-keyboard";
import { useAuthStore } from "@/stores/auth-store";
import { canAssignToSelf, canAssignWork, canManageTeam, canToggleInboxAi, canWrite } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { trackQueue } from "@/lib/conversation-queue-analytics";
import {
  appendOptimisticOutboundMessage,
  createOptimisticOutboundMessage,
  OPTIMISTIC_MESSAGE_PREFIX,
  patchConversationHandoffResolved,
  patchConversationListsAfterOutbound,
  patchThreadLeadStage,
  prependOlderMessages,
  replaceOptimisticOutboundMessage,
  type InboxThreadMessage,
} from "@/lib/inbox-query-cache";
import { refreshQueueStats } from "@/lib/realtime-inbox-cache";
import {
  emitConversationTyping,
  onConversationTyping,
} from "@/lib/realtime-typing";
import {
  cancelInboxThreadQueries,
  invalidateInboxThreadQueries,
  seedInboxThreadBundleCache,
  syncInboxThreadBundleConversation,
  type InboxThreadBundle,
} from "@/lib/inbox-thread-bundle";
import {
  clearInboxDraft,
  loadInboxDraft,
  saveInboxDraft,
  type InboxDraftMeta,
} from "@/lib/inbox-draft-storage";
import {
  loadInboxInsightsOpen,
  saveInboxInsightsOpen,
} from "@/lib/inbox-insights-preference";
import { formatQuotedReply, parseQuotedReply } from "@/lib/inbox-composer-helpers";
import { downloadInboxMessageMedia } from "@/lib/inbox-media-download";
import { getCachedInboxMediaUrl } from "@/lib/inbox-media-cache";
import { getCopyableMessageText, inferInboxMediaFilename, formatPinnedNoteText } from "@/lib/inbox-message-helpers";
import { isPaymentAssistCandidate } from "@/lib/inbox-payment-assist";
import {
  followUpDueAt,
  formatFollowUpTaskTitle,
  type FollowUpPreset,
} from "@/lib/inbox-follow-up-task";
import { InboxInternalNotes } from "@/components/dashboard/inbox-internal-notes";
import {
  InboxVirtualizedThread,
  type InboxVirtualizedThreadHandle,
} from "@/components/dashboard/inbox-virtualized-thread";

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  content: string | null;
  createdAt: string;
  status: string;
  sentByAi?: boolean;
  errorMessage?: string | null;
  waMessageId?: string | null;
  payload?: { context?: { id?: string } | null } | null;
}

interface ConversationDetail {
  id: string;
  contactName: string | null;
  contactPhone: string;
  unreadCount: number;
  lastInboundAt?: string | null;
  aiEnabled: boolean;
  replyMode?: "human_handling" | "workspace_default";
  replyDecision?: ReplyDecision | null;
  pendingDraft?: {
    suggestion: string;
    sources?: Array<{ title: string; citation?: string; similarity: number }>;
    aiRunId?: string;
    createdAt?: string;
  } | null;
  requiresHuman?: boolean;
  handoffReason?: string | null;
  campaignAttribution?: {
    campaignId: string;
    campaignName: string;
    recipientId?: string;
    attributedAt?: string;
  } | null;
  assignment?: AssignmentExplain | null;
  aiContext?: InboxAiContext | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  lead: {
    id: string;
    stage: string;
    score?: number;
    aiConfidence?: number | null;
    valueCents?: number | null;
  } | null;
  messages: Message[];
  hasOlderMessages?: boolean;
  whatsappAccount: { displayPhoneNumber: string; isActive: boolean };
}

interface TeamMember {
  user: { id: string; name: string | null; email: string };
}

interface TimelineEvent {
  id: string;
  type: "stage_change" | "ai_classify" | "automation";
  at: string;
  title: string;
  detail?: string;
}

interface LeadTimeline {
  lead: {
    id: string;
    stage: string;
    score: number;
    aiConfidence: number | null;
    lastClassifiedAt: string | null;
  };
  events: TimelineEvent[];
}

export interface InboxThreadPaneProps {
  conversationId: string;
  listFilter: InboxListFilter;
  peerConversationIds: string[];
  onSelectConversation: (id: string) => void;
  onClearSelection: () => void;
  onShowOutbound: () => void;
}

function InboxThreadPaneInner({
  conversationId,
  listFilter,
  peerConversationIds,
  onSelectConversation,
  onClearSelection,
  onShowOutbound,
}: InboxThreadPaneProps) {
  const copy = useConversationsCopy();
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const myUserId = useAuthStore((s) => s.user?.id);
  const myUserName = useAuthStore((s) => s.user?.name ?? s.user?.email ?? "Teammate");
  const canSend = canWrite(role);
  const canAssignOthers = canAssignWork(role);
  const canEditAssignmentRules = canAssignOthers || canManageTeam(role);
  const canTakeOver = canAssignToSelf(role);
  const canToggleAi = canToggleInboxAi(role);
  const queryClient = useQueryClient();
  const { connected: live } = useRealtime();
  // Realtime "connected" only means the channel subscribed — it does NOT
  // guarantee every broadcast is delivered. The open thread is the most
  // important surface, so keep a background reconcile poll even when live
  // (slower than the offline cadence) so new messages never get stuck until
  // the pane is remounted. Realtime still patches instantly when it works.
  const threadPollInterval = useVisibleRefetchInterval(live ? 8_000 : 4_000);
  const timelinePollInterval = useVisibleRefetchInterval(live ? 30_000 : 12_000);
  const { error: toastError, success: toastSuccess } = useToast();
  const showMutationError = (e: unknown, fallback: string) => {
    toastError(toUserMessage(e, fallback));
  };

  const [draft, setDraft] = useState(() => loadInboxDraft(conversationId)?.text ?? "");
  const [draftMeta, setDraftMeta] = useState<InboxDraftMeta | null>(
    () => loadInboxDraft(conversationId)?.meta ?? null,
  );
  const [sendError, setSendError] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(() => loadInboxInsightsOpen());
  const [lostPrompt, setLostPrompt] = useState(false);
  const [wonPrompt, setWonPrompt] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderOverride, setHasOlderOverride] = useState<boolean | null>(null);
  const threadVirtualRef = useRef<InboxVirtualizedThreadHandle>(null);
  const unreadDividerRef = useRef<{ convId: string; count: number } | null>(null);
  const draftDirtyRef = useRef(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingEmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const threadOpenMarkRef = useRef<string | null>(null);
  const threadOpenStartedRef = useRef<Record<string, number>>({});
  const scrollSmoothRef = useRef(false);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{
    file: File;
    previewUrl?: string;
  } | null>(null);
  const [lightboxMessageId, setLightboxMessageId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [pendingHandoff, setPendingHandoff] = useState<{ userId: string; name: string } | null>(
    null,
  );
  const [followUpExcerpt, setFollowUpExcerpt] = useState<string | null>(null);
  const [paymentAssistDismissed, setPaymentAssistDismissed] = useState(false);
  const prevConversationIdRef = useRef(conversationId);

  const INBOX_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    };
  }, [attachment?.previewUrl]);

  function clearAttachment() {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  }

  function handleAttachFile(file: File) {
    const isImage = INBOX_IMAGE_MIMES.has(file.type);
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      showMutationError(
        new Error("unsupported"),
        "Only JPEG, PNG, WebP images and PDF documents are supported.",
      );
      return;
    }
    if (isImage && file.size > 5 * 1024 * 1024) {
      showMutationError(new Error("too large"), "Images must be 5 MB or smaller.");
      return;
    }
    if (isPdf && file.size > 16 * 1024 * 1024) {
      showMutationError(new Error("too large"), "PDFs must be 16 MB or smaller.");
      return;
    }
    clearAttachment();
    setAttachment({
      file,
      previewUrl: isImage ? URL.createObjectURL(file) : undefined,
    });
  }

  useEffect(() => {
    if (prevConversationIdRef.current === conversationId) return;
    prevConversationIdRef.current = conversationId;
    draftDirtyRef.current = false;
    const saved = loadInboxDraft(conversationId);
    setDraft(saved?.text ?? "");
    setDraftMeta(saved?.meta ?? null);
    setSendError(null);
    setHasOlderOverride(null);
    clearAttachment();
  }, [conversationId]);

  const {
    data: threadBundle,
    isLoading: threadLoading,
    isError: threadError,
    refetch: refetchThread,
  } = useQuery<InboxThreadBundle>({
    queryKey: QUERY_KEYS.conversationThread(conversationId),
    queryFn: async ({ signal }) => {
      const bundle = await apiFetch<InboxThreadBundle>(
        `/conversations/${conversationId}/thread`,
        {
          token: token ?? undefined,
          signal,
        },
      );
      seedInboxThreadBundleCache(queryClient, conversationId, bundle);
      return bundle;
    },
    enabled: !!token && !!conversationId,
    staleTime: STALE.live,
    refetchInterval: threadPollInterval,
    placeholderData: () =>
      queryClient.getQueryData<InboxThreadBundle>(QUERY_KEYS.conversationThread(conversationId)),
  });

  const thread = threadBundle?.conversation as ConversationDetail | undefined;

  const imageMessageIds = useMemo(
    () =>
      thread?.messages
        .filter((m) => m.type === "IMAGE" || m.type === "STICKER")
        .map((m) => m.id) ?? [],
    [thread?.messages],
  );

  useEffect(() => {
    setLightboxMessageId(null);
    setLightboxUrl(null);
    setPendingHandoff(null);
    setFollowUpExcerpt(null);
    setPaymentAssistDismissed(false);
  }, [conversationId]);

  useEffect(() => {
    if (!lightboxMessageId) {
      setLightboxUrl(null);
      return;
    }
    let cancelled = false;
    void getCachedInboxMediaUrl(conversationId, lightboxMessageId).then((url) => {
      if (!cancelled) setLightboxUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId, lightboxMessageId]);
  const inboxContext = threadBundle?.inboxContext;

  useEffect(() => {
    if (!thread || threadLoading) return;
    if (threadOpenMarkRef.current === conversationId) return;
    const started = threadOpenStartedRef.current[conversationId];
    if (started == null) return;
    threadOpenMarkRef.current = conversationId;
    measureInteraction("inbox.open_thread", started, { conversationId });
  }, [conversationId, thread, threadLoading]);

  useEffect(() => {
    if (threadOpenStartedRef.current[conversationId] == null) {
      threadOpenStartedRef.current[conversationId] = startInteraction();
      threadOpenMarkRef.current = null;
    }
  }, [conversationId]);

  const leadId = thread?.lead?.id;

  const { data: timeline } = useQuery({
    queryKey: leadId ? QUERY_KEYS.leadTimeline(leadId) : ["lead-timeline"],
    queryFn: () =>
      apiFetch<LeadTimeline>(`/leads/${leadId}/timeline`, { token: token ?? undefined }),
    enabled: !!token && !!leadId,
    refetchInterval: timelinePollInterval,
  });

  const { data: capabilities } = useShellConversationCapabilities();
  const { data: coachingProgress } = useShellOnboardingCoaching();
  const coachTakeover =
    !!coachingProgress?.coaching?.eligible &&
    coachingProgress.coaching.next?.id === "takeover";

  const { data: replyTemplates } = useQuery({
    queryKey: ["reply-templates"],
    queryFn: () =>
      apiFetch<{ templates: Array<{ id: string; title: string; body: string }> }>(
        "/organizations/reply-templates",
        { token: token ?? undefined },
      ),
    enabled: !!token,
    staleTime: 120_000,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => apiFetch<TeamMember[]>("/organizations/members", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 120_000,
  });

  const lastMsgId = thread?.messages[thread.messages.length - 1]?.id;

  function highlightMessage(messageId: string) {
    setHighlightMessageId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightMessageId(null), 1600);
  }

  function jumpToMessage(messageId: string) {
    threadVirtualRef.current?.jumpToMessage(messageId);
  }

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      if (typingEmitRef.current) clearTimeout(typingEmitRef.current);
    };
  }, []);

  useEffect(() => {
    return onConversationTyping((payload) => {
      if (payload.conversationId !== conversationId) return;
      setTypingUser(payload.userName);
      if (typingClearRef.current) clearTimeout(typingClearRef.current);
      typingClearRef.current = setTimeout(() => setTypingUser(null), 3500);
    });
  }, [conversationId]);

  function emitTyping() {
    if (typingEmitRef.current) return;
    emitConversationTyping(conversationId, myUserName);
    typingEmitRef.current = setTimeout(() => {
      typingEmitRef.current = null;
    }, 2000);
  }

  useEffect(() => {
    saveInboxDraft(conversationId, { text: draft, meta: draftMeta });
  }, [conversationId, draft, draftMeta]);

  useEffect(() => {
    if (thread?.requiresHuman) composeRef.current?.focus();
  }, [thread?.requiresHuman, thread?.id]);

  useEffect(() => {
    const pending = thread?.pendingDraft;
    if (!pending?.suggestion || !thread?.aiEnabled || draftDirtyRef.current) return;
    setDraft(pending.suggestion);
    setDraftMeta({
      aiRunId: pending.aiRunId,
      sources: pending.sources ?? [],
    });
  }, [thread?.id, thread?.pendingDraft?.createdAt, thread?.aiEnabled]);

  const shouldLoadKnowledgeGaps =
    !!thread &&
    inboxContext != null &&
    (inboxContext.kbHealth?.chunkCount ?? 0) > 0 &&
    (thread.requiresHuman || thread.aiEnabled);

  const { data: knowledgeGapsData } = useQuery({
    queryKey: QUERY_KEYS.conversationKnowledgeGaps(conversationId),
    queryFn: ({ signal }) =>
      apiFetch<{ knowledgeGaps: string[] }>(
        `/conversations/${conversationId}/knowledge-gaps`,
        { token: token ?? undefined, signal },
      ),
    enabled: !!token && shouldLoadKnowledgeGaps,
    staleTime: 120_000,
  });

  const replyDecision = thread?.replyDecision ?? inboxContext?.replyDecision ?? null;

  const suggestMutation = useMutation({
    mutationFn: () =>
      apiFetch<{
        suggestion: string;
        aiRunId?: string;
        sources: Array<{ title: string; citation?: string; similarity: number }>;
      }>(`/conversations/${conversationId}/suggest-reply`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: (res) => {
      draftDirtyRef.current = false;
      setDraft(res.suggestion);
      setDraftMeta({ aiRunId: res.aiRunId, sources: res.sources ?? [] });
      setSendError(null);
      invalidateInboxThreadQueries(queryClient, conversationId);
    },
    onError: (e) => {
      setSendError(toUserMessage(e, "Could not suggest a reply."));
    },
  });

  const translateMutation = useMutation({
    mutationFn: (target: "hi" | "en") => {
      const { body } = parseQuotedReply(draft);
      return apiFetch<{ text: string }>(`/conversations/${conversationId}/translate-draft`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ text: body, target }),
      });
    },
    onSuccess: (res) => {
      const { quote } = parseQuotedReply(draft);
      const prefix = quote ? formatQuotedReply(quote) : "";
      setDraft(prefix + res.text);
      composeRef.current?.focus();
    },
    onError: (e) => showMutationError(e, "Could not translate draft."),
  });

  const pinNoteMutation = useMutation({
    mutationFn: (text: string) => {
      const leadId = thread?.lead?.id;
      if (!leadId) throw new Error("No lead linked to this conversation.");
      return apiFetch(`/leads/${leadId}/notes`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ body: text }),
      });
    },
    onSuccess: () => {
      const leadId = thread?.lead?.id;
      if (leadId) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leadNotes(leadId) });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leadTimeline(leadId) });
      }
      toastSuccess(copy.pinToNoteSuccess);
    },
    onError: (e) => showMutationError(e, "Could not save to team notes."),
  });

  const aiToggleMutation = useMutation({
    mutationFn: (aiEnabled: boolean) =>
      apiFetch<ConversationDetail>(`/conversations/${conversationId}/ai`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ aiEnabled }),
      }),
    onMutate: async (aiEnabled) => {
      await cancelInboxThreadQueries(queryClient, conversationId);
      const previousThread = queryClient.getQueryData<ConversationDetail>(
        QUERY_KEYS.conversation(conversationId),
      );
      if (previousThread) {
        syncInboxThreadBundleConversation(queryClient, conversationId, {
          ...previousThread,
          aiEnabled,
        });
      }
      return { previousThread };
    },
    onSuccess: (updated) => {
      syncInboxThreadBundleConversation(queryClient, conversationId, updated);
    },
    onError: (e, _vars, context) => {
      if (context?.previousThread) {
        syncInboxThreadBundleConversation(queryClient, conversationId, context.previousThread);
      }
      showMutationError(e, "Could not update AI settings.");
    },
  });

  const lastMessage = thread?.messages[thread.messages.length - 1];
  const lastInboundMs =
    thread?.lastInboundAt != null
      ? new Date(thread.lastInboundAt).getTime()
      : lastMessage?.direction === "INBOUND"
        ? new Date(lastMessage.createdAt).getTime()
        : 0;
  const decisionMs = replyDecision?.evaluatedAt
    ? new Date(replyDecision.evaluatedAt).getTime()
    : 0;
  const classifySettled =
    !!replyDecision && lastInboundMs > 0 && decisionMs >= lastInboundMs - 3_000;
  const classifySkipped =
    !!replyDecision &&
    replyDecision.mode === "skip" &&
    lastInboundMs > 0 &&
    decisionMs >= lastInboundMs - 3_000;
  const classifyGiveUp =
    lastInboundMs > 0 && Date.now() - lastInboundMs > 45_000 && !classifySettled;

  const awaitingAiDraft =
    !!thread?.aiEnabled &&
    !thread?.pendingDraft?.suggestion &&
    !suggestMutation.isPending &&
    !aiToggleMutation.isPending &&
    lastMessage?.direction === "INBOUND" &&
    !classifySettled &&
    !classifySkipped &&
    !classifyGiveUp &&
    lastInboundMs > 0 &&
    Date.now() - lastInboundMs < 120_000;

  const assignMutation = useMutation({
    mutationFn: (assignToUserId: string | null) =>
      apiFetch<ConversationDetail>(`/conversations/${conversationId}/assign`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ assignToUserId }),
      }),
    onMutate: async (assignToUserId) => {
      await cancelInboxThreadQueries(queryClient, conversationId);
      const previousThread = queryClient.getQueryData<ConversationDetail>(
        QUERY_KEYS.conversation(conversationId),
      );
      if (previousThread) {
        const member = assignToUserId
          ? teamMembers?.find((m) => m.user.id === assignToUserId)?.user
          : null;
        const assignedTo = assignToUserId
          ? { id: assignToUserId, name: member?.name ?? null, email: member?.email ?? "" }
          : null;
        syncInboxThreadBundleConversation(queryClient, conversationId, {
          ...previousThread,
          assignedTo,
        });
      }
      return { previousThread };
    },
    onSuccess: (updated) => {
      syncInboxThreadBundleConversation(queryClient, conversationId, updated);
      refreshQueueStats(queryClient);
    },
    onError: (e, _vars, context) => {
      if (context?.previousThread) {
        syncInboxThreadBundleConversation(queryClient, conversationId, context.previousThread);
      }
      showMutationError(e, "Could not assign this conversation.");
    },
  });

  const followUpMutation = useMutation({
    mutationFn: ({ preset, excerpt }: { preset: FollowUpPreset; excerpt: string | null }) => {
      const leadId = thread?.lead?.id;
      if (!leadId) {
        throw new Error(
          "This conversation needs a pipeline lead before you can schedule a follow-up.",
        );
      }
      const contact = thread?.contactName ?? thread?.contactPhone ?? "contact";
      return apiFetch("/tasks", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          title: formatFollowUpTaskTitle(contact, excerpt),
          leadId,
          assignedToId: myUserId,
          dueAt: followUpDueAt(preset).toISOString(),
          priority: "HIGH",
        }),
      });
    },
    onSuccess: () => {
      setFollowUpExcerpt(null);
      toastSuccess(copy.followUpSuccess);
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks-summary"] });
    },
    onError: (e) => showMutationError(e, "Could not create follow-up task."),
  });

  const stageMutation = useMutation({
    mutationFn: ({ stage, reason }: { stage: LeadStage; reason?: string }) =>
      apiFetch(`/leads/${thread?.lead?.id}/stage`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ stage, reason }),
      }),
    onMutate: async ({ stage }) => {
      await cancelInboxThreadQueries(queryClient, conversationId);
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.conversationsList });
      const previousThread = queryClient.getQueryData<ConversationDetail>(
        QUERY_KEYS.conversation(conversationId),
      );
      const previousLists = queryClient.getQueriesData({ queryKey: QUERY_KEYS.conversationsList });
      patchThreadLeadStage(queryClient, conversationId, stage);
      return { previousThread, previousLists };
    },
    onError: (e, _vars, context) => {
      if (context?.previousThread) {
        syncInboxThreadBundleConversation(queryClient, conversationId, context.previousThread);
      }
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      showMutationError(e, "Could not update pipeline stage.");
    },
    onSettled: () => {
      invalidateInboxThreadQueries(queryClient, conversationId);
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      if (leadId) void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leadTimeline(leadId) });
    },
  });

  function handleStageChange(next: LeadStage) {
    if (!thread?.lead || next === thread.lead.stage) return;
    if (next === "LOST") {
      setLostPrompt(true);
      return;
    }
    if (next === "WON") {
      setWonPrompt(true);
      return;
    }
    stageMutation.mutate({ stage: next });
  }

  function advanceAfterAction(doneId: string) {
    if (listFilter !== "handoff") return;
    const remaining = peerConversationIds.filter((id) => id !== doneId);
    if (remaining[0]) {
      trackQueue("queue_advance_next", { filter: listFilter, remaining: remaining.length });
      onSelectConversation(remaining[0]);
      return;
    }
    trackQueue("queue_caught_up", { filter: listFilter });
  }

  const resolveHandoffMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/conversations/${conversationId}/resolve-handoff`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onMutate: async () => {
      await cancelInboxThreadQueries(queryClient, conversationId);
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.conversationsList });
      const previousThread = queryClient.getQueryData<ConversationDetail>(
        QUERY_KEYS.conversation(conversationId),
      );
      const previousLists = queryClient.getQueriesData({ queryKey: QUERY_KEYS.conversationsList });
      const previousStats = {
        full: queryClient.getQueryData(QUERY_KEYS.conversationStats()),
        queue: queryClient.getQueryData(QUERY_KEYS.conversationQueueStats),
      };
      patchConversationHandoffResolved(queryClient, conversationId);
      return { previousThread, previousLists, previousStats, doneId: conversationId };
    },
    onSuccess: (_data, _vars, context) => {
      if (context?.doneId) advanceAfterAction(context.doneId);
    },
    onError: (e, _vars, context) => {
      if (context?.previousThread) {
        syncInboxThreadBundleConversation(queryClient, conversationId, context.previousThread);
      }
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context?.previousStats) {
        queryClient.setQueryData(QUERY_KEYS.conversationStats(), context.previousStats.full);
        queryClient.setQueryData(QUERY_KEYS.conversationQueueStats, context.previousStats.queue);
      }
      showMutationError(e, "Could not resolve handoff.");
    },
    onSettled: () => {
      refreshQueueStats(queryClient);
    },
  });

  const takeoverMutation = useMutation({
    mutationFn: (taskTitle?: string) =>
      apiFetch<ConversationDetail>(`/conversations/${conversationId}/takeover`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ taskTitle }),
      }),
    onSuccess: (updated) => {
      trackCoaching("coaching_takeover_complete");
      syncInboxThreadBundleConversation(queryClient, conversationId, updated);
      refreshQueueStats(queryClient);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onboardingCoaching });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.onboardingProgress });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e) => showMutationError(e, "Could not take over this conversation."),
  });

  const sendMutation = useMutation({
    mutationFn: ({
      content,
      draftText,
      aiRunId,
      replyToMessageId,
    }: {
      content: string;
      draftText?: string;
      aiRunId?: string;
      replyToMessageId?: string;
    }) =>
      apiFetch<InboxThreadMessage>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ content, draftText, aiRunId, replyToMessageId }),
      }),
    onMutate: async ({ content }) => {
      await cancelInboxThreadQueries(queryClient, conversationId);
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.conversationsList });
      const previousThread = queryClient.getQueryData<ConversationDetail>(
        QUERY_KEYS.conversation(conversationId),
      );
      const previousLists = queryClient.getQueriesData({ queryKey: QUERY_KEYS.conversationsList });
      const savedDraft = draft;
      const savedDraftMeta = draftMeta;
      const optimisticId = `${OPTIMISTIC_MESSAGE_PREFIX}${Date.now()}`;

      if (!previousThread) {
        return { previousThread, previousLists, savedDraft, savedDraftMeta, optimisticId: null };
      }

      const optimisticMessage = createOptimisticOutboundMessage(content, optimisticId);
      setDraft("");
      setDraftMeta(null);
      clearInboxDraft(conversationId);
      setSendError(null);
      appendOptimisticOutboundMessage(queryClient, conversationId, optimisticMessage);
      if (previousThread.pendingDraft) {
        syncInboxThreadBundleConversation(queryClient, conversationId, {
          ...previousThread,
          pendingDraft: null,
        });
      }
      patchConversationListsAfterOutbound(
        queryClient,
        conversationId,
        content,
        optimisticMessage.createdAt,
      );

      return { previousThread, previousLists, savedDraft, savedDraftMeta, optimisticId };
    },
    onSuccess: (serverMessage, _vars, context) => {
      if (context?.optimisticId) {
        replaceOptimisticOutboundMessage(
          queryClient,
          conversationId,
          context.optimisticId,
          serverMessage,
        );
        patchConversationListsAfterOutbound(
          queryClient,
          conversationId,
          serverMessage.content ?? "",
          serverMessage.createdAt,
        );
      }
      setDraft("");
      setDraftMeta(null);
      clearInboxDraft(conversationId);
      setSendError(null);
    },
    onError: (e, _vars, context) => {
      if (context?.previousThread) {
        syncInboxThreadBundleConversation(queryClient, conversationId, context.previousThread);
      }
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (context) {
        setDraft(context.savedDraft);
        setDraftMeta(context.savedDraftMeta);
      }
      setSendError(toUserMessage(e, "Message could not be sent."));
    },
    onSettled: () => {
      refreshQueueStats(queryClient);
    },
  });

  const sendMediaMutation = useMutation({
    mutationFn: (form: FormData) =>
      apiUpload<InboxThreadMessage>(`/conversations/${conversationId}/messages/media`, form, {
        token: token ?? undefined,
      }),
    onMutate: async (form) => {
      await cancelInboxThreadQueries(queryClient, conversationId);
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.conversationsList });
      const previousThread = queryClient.getQueryData<ConversationDetail>(
        QUERY_KEYS.conversation(conversationId),
      );
      const previousLists = queryClient.getQueriesData({ queryKey: QUERY_KEYS.conversationsList });
      const caption = (form.get("caption") as string | null)?.trim() || "";
      const preview = caption || "\uD83D\uDCCE Attachment";
      const optimisticId = `${OPTIMISTIC_MESSAGE_PREFIX}${Date.now()}`;

      if (previousThread) {
        appendOptimisticOutboundMessage(
          queryClient,
          conversationId,
          createOptimisticOutboundMessage(preview, optimisticId),
        );
        patchConversationListsAfterOutbound(
          queryClient,
          conversationId,
          preview,
          new Date().toISOString(),
        );
      }
      return { previousThread, previousLists };
    },
    onSuccess: (serverMessage) => {
      scrollSmoothRef.current = true;
      // Refetch to render the real attachment (signed media URL), replacing the optimistic bubble.
      invalidateInboxThreadQueries(queryClient, conversationId);
      patchConversationListsAfterOutbound(
        queryClient,
        conversationId,
        serverMessage.content ?? "",
        serverMessage.createdAt,
      );
      setDraft("");
      setDraftMeta(null);
      clearInboxDraft(conversationId);
      clearAttachment();
      setSendError(null);
    },
    onError: (e, _vars, context) => {
      if (context?.previousThread) {
        syncInboxThreadBundleConversation(queryClient, conversationId, context.previousThread);
      }
      context?.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      setSendError(toUserMessage(e, "Attachment could not be sent."));
    },
    onSettled: () => {
      refreshQueueStats(queryClient);
    },
  });

  const sendPending = sendMutation.isPending || sendMediaMutation.isPending;

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (sendPending) return;

    if (attachment) {
      const form = new FormData();
      form.append("file", attachment.file);
      const caption = draft.trim();
      if (caption) form.append("caption", caption);
      scrollSmoothRef.current = true;
      sendMediaMutation.mutate(form);
      return;
    }

    const text = draft.trim();
    if (!text) return;
    scrollSmoothRef.current = true;
    sendMutation.mutate({
      content: text,
      draftText: draftMeta?.aiRunId ? text : undefined,
      aiRunId: draftMeta?.aiRunId,
      replyToMessageId: draftMeta?.replyToMessageId,
    });
  }

  const withinMessagingWindow = (() => {
    if (!thread?.lastInboundAt) return false;
    const last = new Date(thread.lastInboundAt).getTime();
    if (Number.isNaN(last)) return false;
    return Date.now() - last < 24 * 60 * 60 * 1000;
  })();

  const windowClosed = !!thread && !withinMessagingWindow;
  const hasOlderMessages = hasOlderOverride ?? thread?.hasOlderMessages ?? false;

  async function loadOlderMessages() {
    if (!thread?.messages[0] || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const oldest = thread.messages[0].createdAt;
      const res = await apiFetch<{ messages: Message[]; hasMore: boolean }>(
        `/conversations/${conversationId}/messages?before=${encodeURIComponent(oldest)}`,
        { token: token ?? undefined },
      );
      prependOlderMessages(queryClient, conversationId, res.messages, res.hasMore);
      setHasOlderOverride(res.hasMore);
    } catch (e) {
      showMutationError(e, "Could not load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }

  function toggleInsightsPanel() {
    setShowTimeline((v) => {
      const next = !v;
      saveInboxInsightsOpen(next);
      return next;
    });
  }

  function quoteInboundMessage(content: string | null, messageId?: string) {
    const quote = formatQuotedReply(content ?? "");
    if (!quote) return;
    setDraft((prev) => {
      const { body } = parseQuotedReply(prev);
      return quote + body;
    });
    setDraftMeta((prev) => ({
      sources: prev?.sources ?? [],
      aiRunId: prev?.aiRunId,
      replyToMessageId: messageId ?? prev?.replyToMessageId,
    }));
    composeRef.current?.focus();
  }

  async function copyMessageText(content: string | null) {
    const text = getCopyableMessageText(content);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess(copy.copyMessageSuccess);
    } catch (e) {
      showMutationError(e, "Could not copy message.");
    }
  }

  function requestAssign(assignToUserId: string | null) {
    if (!assignToUserId) {
      assignMutation.mutate(null);
      return;
    }
    if (assignToUserId === thread?.assignedTo?.id) return;
    if (canAssignOthers && assignToUserId !== myUserId) {
      const member = (teamMembers ?? []).find((m) => m.user.id === assignToUserId);
      setPendingHandoff({
        userId: assignToUserId,
        name: member?.user.name ?? member?.user.email ?? "Teammate",
      });
      return;
    }
    assignMutation.mutate(assignToUserId);
  }

  async function exportConversation() {
    if (!thread) return;
    const contact = thread.contactName ?? thread.contactPhone;
    const safe =
      contact.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "chat";
    try {
      await apiDownload(
        `/conversations/${conversationId}/export`,
        `growvisi-${safe.slice(0, 40)}.txt`,
        token ?? undefined,
      );
      toastSuccess(copy.exportConversationSuccess);
    } catch (e) {
      showMutationError(e, "Could not export conversation.");
    }
  }

  function openFollowUp(excerpt: string | null) {
    if (!thread?.lead?.id || !canSend) return;
    setFollowUpExcerpt(excerpt);
  }

  function pinMessage(content: string | null) {
    const text = getCopyableMessageText(content) ?? content?.trim();
    if (!text || !thread?.lead?.id || !canSend) return;
    pinNoteMutation.mutate(formatPinnedNoteText(text));
  }

  function canRetryMessage(m: Message): boolean {
    return (
      m.direction === "OUTBOUND" &&
      (m.type ?? "TEXT") === "TEXT" &&
      !!m.content?.trim() &&
      canSend &&
      !windowClosed &&
      !sendPending
    );
  }

  function retryFailedMessage(m: Message) {
    if (!canRetryMessage(m) || !m.content) return;
    scrollSmoothRef.current = true;
    sendMutation.mutate({ content: m.content.trim() });
  }

  const quoteInboundRef = useRef(quoteInboundMessage);
  quoteInboundRef.current = quoteInboundMessage;

  const lastInboundForQuote = useMemo(() => {
    if (!thread?.messages?.length) return null;
    for (let i = thread.messages.length - 1; i >= 0; i--) {
      const m = thread.messages[i];
      if (
        m.direction === "INBOUND" &&
        m.content &&
        (m.type ?? "TEXT") !== "REACTION"
      ) {
        return m;
      }
    }
    return null;
  }, [thread?.messages]);

  useInboxThreadKeyboard({
    enabled: !!thread && !threadLoading,
    onFocusComposer: () => composeRef.current?.focus(),
    onToggleSearch: () => {
      setSearchOpen((open) => {
        if (open) {
          setSearchQuery("");
          setSearchMatchIndex(0);
        }
        return !open;
      });
    },
    onQuoteLastInbound: lastInboundForQuote
      ? () =>
          quoteInboundRef.current(
            lastInboundForQuote.content,
            lastInboundForQuote.id,
          )
      : undefined,
  });

  if (threadLoading && !thread) {
    return <InboxThreadSkeleton />;
  }

  if (threadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-destructive">{copy.threadLoadError}</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => void refetchThread()}>
            {copy.threadRetry}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClearSelection}>
            {copy.threadBackToList}
          </Button>
        </div>
      </div>
    );
  }

  if (!thread) return null;

  const lightboxMessage = lightboxMessageId
    ? thread.messages.find((m) => m.id === lightboxMessageId)
    : undefined;
  const lightboxIndex = lightboxMessageId ? imageMessageIds.indexOf(lightboxMessageId) : -1;

  const latestInbound = (() => {
    for (let i = thread.messages.length - 1; i >= 0; i--) {
      const m = thread.messages[i];
      if (m.direction === "INBOUND") return m;
    }
    return null;
  })();

  const showPaymentAssist =
    !paymentAssistDismissed &&
    !!latestInbound &&
    isPaymentAssistCandidate(latestInbound.type ?? "TEXT", latestInbound.content) &&
    thread.lead?.stage !== "WON";

  const recentCustomerSnippet = (() => {
    const inbound = thread.messages
      .filter((m) => m.direction === "INBOUND" && m.content?.trim())
      .slice(-3);
    if (!inbound.length) return null;
    return inbound.map((m) => m.content).join("\n");
  })();

  // Capture the unread count once per conversation (before mark-read zeroes it)
  // so we can render a "new messages" divider at the right position.
  if (unreadDividerRef.current?.convId !== conversationId) {
    unreadDividerRef.current = { convId: conversationId, count: thread.unreadCount ?? 0 };
  }
  const initialUnread = unreadDividerRef.current?.count ?? 0;
  const unreadDividerBeforeId = (() => {
    if (initialUnread <= 0) return null;
    let seen = 0;
    for (let i = thread.messages.length - 1; i >= 0; i--) {
      if (thread.messages[i].direction === "INBOUND") {
        seen += 1;
        if (seen === initialUnread) return thread.messages[i].id;
      }
    }
    return null;
  })();

  // Map WhatsApp message ids so a reply's `context.id` can resolve to the
  // original message we render (enables the quoted preview + jump-to-source).
  const messagesByWaId = new Map<string, Message>();
  for (const m of thread.messages) {
    if (m.waMessageId) messagesByWaId.set(m.waMessageId, m);
  }
  const quotedMessageFor = (m: Message): Message | null => {
    const ctxId = m.payload?.context?.id;
    if (!ctxId) return null;
    return messagesByWaId.get(ctxId) ?? null;
  };

  // In-thread search over loaded messages (client-side, highlight + jump).
  const threadMessages = thread.messages;
  const searchQ = searchQuery.trim().toLowerCase();
  const searchMatchIds =
    searchOpen && searchQ
      ? threadMessages
          .filter((m) =>
            (getCopyableMessageText(m.content) ?? m.content ?? "")
              .toLowerCase()
              .includes(searchQ),
          )
          .map((m) => m.id)
      : [];
  const activeSearchId = searchMatchIds[searchMatchIndex] ?? null;
  const searchMatchSet = new Set(searchMatchIds);

  function goToSearchMatch(index: number) {
    if (searchMatchIds.length === 0) return;
    const wrapped = (index + searchMatchIds.length) % searchMatchIds.length;
    setSearchMatchIndex(wrapped);
    const id = searchMatchIds[wrapped];
    if (id) jumpToMessage(id);
  }

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    setSearchMatchIndex(0);
    const q = value.trim().toLowerCase();
    if (!q) return;
    const firstId = threadMessages.find((m) =>
      (getCopyableMessageText(m.content) ?? m.content ?? "").toLowerCase().includes(q),
    )?.id;
    if (firstId) requestAnimationFrame(() => jumpToMessage(firstId));
  }

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchMatchIndex(0);
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 min-w-0">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-border/80 bg-card">
            <div className="flex items-center gap-3 px-4 py-3 lg:px-5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 md:hidden"
                onClick={onClearSelection}
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <AvatarInitials name={thread.contactName ?? thread.contactPhone} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {thread.contactName ?? thread.contactPhone}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="truncate">{thread.contactPhone}</span>
                  {inboxContext?.workingMemory &&
                  (inboxContext.workingMemory.relationshipPhase === "post_sale" ||
                    inboxContext.workingMemory.relationshipPhase === "win_back") ? (
                    <>
                      <span aria-hidden className="text-border">
                        ·
                      </span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                        {formatRelationshipPhase(inboxContext.workingMemory.relationshipPhase)}
                      </span>
                    </>
                  ) : null}
                  {thread.lead &&
                    (() => {
                      const lead = thread.lead;
                      const hasValue = lead.valueCents != null && lead.valueCents > 0;
                      const closed = lead.stage === "WON" || lead.stage === "LOST";
                      const pipelineHref = `/dashboard/pipeline?lead=${lead.id}`;

                      if (hasValue) {
                        const label =
                          lead.stage === "WON"
                            ? copy.dealClosed(formatInr(lead.valueCents))
                            : copy.dealValue(formatInr(lead.valueCents));
                        return (
                          <>
                            <span aria-hidden className="text-border">
                              ·
                            </span>
                            <Link
                              href={pipelineHref}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium transition hover:underline",
                                lead.stage === "WON"
                                  ? "bg-success/10 text-success"
                                  : "bg-background text-foreground",
                              )}
                              title="Deal ₹ tracked on Pipeline — tap to view or edit"
                            >
                              {label}
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                            </Link>
                          </>
                        );
                      }

                      if (!closed) {
                        return (
                          <>
                            <span aria-hidden className="text-border">
                              ·
                            </span>
                            <Link
                              href={pipelineHref}
                              className="font-medium text-muted-foreground hover:text-accent hover:underline"
                            >
                              {copy.addDealValue}
                            </Link>
                          </>
                        );
                      }

                      return (
                        <>
                          <span aria-hidden className="text-border">
                            ·
                          </span>
                          <Link
                            href={pipelineHref}
                            className="inline-flex items-center gap-0.5 font-medium text-accent hover:underline"
                          >
                            {copy.viewOnPipeline}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </>
                      );
                    })()}
                </div>
              </div>
              <div className="hidden shrink-0 flex-wrap items-center justify-end gap-1.5 md:flex">
                {thread.lead?.score != null && thread.lead.score > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      thread.lead.score >= HOT_LEAD_SCORE_THRESHOLD
                        ? "bg-accent text-white"
                        : "bg-bento-mint text-accent",
                    )}
                    title="Lead score from AI"
                  >
                    {thread.lead.score >= HOT_LEAD_SCORE_THRESHOLD
                      ? copy.scoreHot(thread.lead.score)
                      : copy.scoreWarm(thread.lead.score)}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 text-muted-foreground",
                    searchOpen && "bg-muted text-foreground",
                  )}
                  aria-label={copy.searchInConversation}
                  title={copy.searchInConversation}
                  aria-pressed={searchOpen}
                  onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  aria-label={copy.exportConversation}
                  title={copy.exportConversation}
                  onClick={() => void exportConversation()}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {thread.lead &&
                  (canSend ? (
                    <select
                      className={cn(
                        "max-w-[110px] truncate rounded-full border px-2 py-0.5 text-xs font-semibold",
                        STAGE_BADGE[thread.lead.stage as LeadStage] ?? "bg-primary-soft text-accent",
                      )}
                      value={thread.lead.stage}
                      disabled={stageMutation.isPending}
                      onChange={(e) => handleStageChange(e.target.value as LeadStage)}
                    >
                      {LEAD_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {copy.stageLabel(s)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        STAGE_BADGE[thread.lead.stage as LeadStage],
                      )}
                    >
                      {copy.stageLabel(thread.lead.stage)}
                    </span>
                  ))}
                {thread.requiresHuman && (
                  <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
                    {copy.waitingOnYou}
                  </span>
                )}
              </div>
            </div>
            {thread.campaignAttribution && (
              <InboxCampaignAttributionBanner attribution={thread.campaignAttribution} />
            )}
            <InboxThreadDetailsMobile
              stage={thread.lead?.stage as LeadStage | undefined}
              score={thread.lead?.score}
              assignedToId={thread.assignedTo?.id ?? null}
              assignment={thread.assignment}
              showAssignmentRulesLink={canEditAssignmentRules}
              teamMembers={teamMembers ?? []}
              canAssignOthers={canAssignOthers}
              canTakeOver={canTakeOver}
              myUserId={myUserId}
              canEditStage={canSend && !!thread.lead}
              stagePending={stageMutation.isPending}
              assignPending={assignMutation.isPending}
              onStageChange={(s) => handleStageChange(s)}
              onAssign={(userId) => requestAssign(userId)}
            />
            <InboxAiPanel
              aiContext={thread.aiContext ?? null}
              requiresHuman={thread.requiresHuman}
              handoffReason={thread.handoffReason}
              canEdit={canSend}
              takeoverPending={takeoverMutation.isPending}
              resolvePending={resolveHandoffMutation.isPending}
              coachTakeover={coachTakeover}
              onTakeover={(title) => {
                const t =
                  title ||
                  thread.aiContext?.nextAction ||
                  `Follow up: ${thread.contactName ?? thread.contactPhone}`;
                takeoverMutation.mutate(t);
              }}
              onResolveHandoff={() => resolveHandoffMutation.mutate()}
              knowledgeGaps={knowledgeGapsData?.knowledgeGaps ?? []}
              kbHealth={inboxContext?.kbHealth ?? null}
            />
            <InboxOwnershipStrip
              aiEnabled={thread.aiEnabled}
              canToggle={canToggleAi}
              togglePending={aiToggleMutation.isPending}
              onTakeOver={() => aiToggleMutation.mutate(false)}
              onLetAiAssist={() => aiToggleMutation.mutate(true)}
              assigneeLabel={thread.assignedTo?.name ?? thread.assignedTo?.email ?? undefined}
              className="md:hidden"
            />
            <InboxHandlingBar
              className="hidden md:flex"
              aiEnabled={thread.aiEnabled}
              canToggleAi={canToggleAi}
              togglePending={aiToggleMutation.isPending}
              onTakeOverAi={() => aiToggleMutation.mutate(false)}
              onLetAiAssist={() => aiToggleMutation.mutate(true)}
              assigneeLabel={thread.assignedTo?.name ?? thread.assignedTo?.email ?? undefined}
              canAssignOthers={canAssignOthers}
              canTakeOver={canTakeOver}
              assignedToId={thread.assignedTo?.id ?? null}
              assignPending={assignMutation.isPending}
              teamMembers={teamMembers ?? []}
              myUserId={myUserId}
              onAssign={(userId) => requestAssign(userId)}
            />
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col">
          {searchOpen && (
            <div className="flex shrink-0 items-center gap-2 border-b border-border/70 bg-card px-3 py-2 lg:px-5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    closeSearch();
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    goToSearchMatch(searchMatchIndex + (e.shiftKey ? -1 : 1));
                  }
                }}
                placeholder={copy.searchInConversation}
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {searchQ
                  ? searchMatchIds.length > 0
                    ? `${searchMatchIndex + 1}/${searchMatchIds.length}`
                    : copy.searchNoMatches
                  : ""}
              </span>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  disabled={searchMatchIds.length === 0}
                  onClick={() => goToSearchMatch(searchMatchIndex - 1)}
                  aria-label={copy.searchPrev}
                  className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={searchMatchIds.length === 0}
                  onClick={() => goToSearchMatch(searchMatchIndex + 1)}
                  aria-label={copy.searchNext}
                  className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label={copy.searchClose}
                  className="ml-1 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          <InboxVirtualizedThread
            ref={threadVirtualRef}
            conversationId={thread.id}
            contactLabel={thread.contactName ?? thread.contactPhone}
            messages={thread.messages}
            hasOlderMessages={hasOlderMessages}
            loadingOlder={loadingOlder}
            onLoadOlder={() => void loadOlderMessages()}
            unreadDividerBeforeId={unreadDividerBeforeId}
            unreadDividerLabel={copy.newMessages}
            highlightMessageId={highlightMessageId}
            activeSearchId={activeSearchId}
            searchMatchSet={searchMatchSet}
            canSend={canSend}
            windowClosed={windowClosed}
            hasLead={!!thread.lead?.id}
            messageFailedLabel={copy.messageFailed}
            messageRetryLabel={copy.messageRetry}
            replyingToYouLabel={copy.replyingToYou}
            replyingToAttachmentLabel={copy.replyingToAttachment}
            jumpToLatestLabel={copy.jumpToLatest}
            lastMsgId={lastMsgId}
            scrollSmoothRef={scrollSmoothRef}
            onImageOpen={setLightboxMessageId}
            onHighlightMessage={highlightMessage}
            quotedMessageFor={quotedMessageFor}
            onQuote={quoteInboundMessage}
            onCopy={(content) => void copyMessageText(content)}
            onPin={pinMessage}
            onFollowUp={openFollowUp}
            onRetry={retryFailedMessage}
            canRetryMessage={canRetryMessage}
          />
          </div>

          <div className="shrink-0 border-t border-border/80 bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <InboxSessionStatus lastInboundAt={thread.lastInboundAt} />
              <InboxTypingIndicator userName={typingUser} />
              {showPaymentAssist && (
                <InboxPaymentAssistBanner
                  onMarkWon={() => {
                    if (thread.lead) setWonPrompt(true);
                  }}
                  onDismiss={() => setPaymentAssistDismissed(true)}
                />
              )}
              {windowClosed && (
                <div className="mb-3 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
                  <p className="font-semibold">24-hour reply window closed</p>
                  <p className="mt-0.5 text-warning">
                    Free-text replies need a recent customer message. Use{" "}
                    <button
                      type="button"
                      className="font-semibold underline"
                      onClick={onShowOutbound}
                    >
                      New message
                    </button>{" "}
                    with an approved WhatsApp template to re-engage.
                  </p>
                </div>
              )}
              {awaitingAiDraft && (
                <div className="mb-2 flex items-center gap-2 rounded-lg px-1 py-0.5 text-xs text-muted-foreground">
                  <span
                    className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
                    aria-hidden
                  />
                  <span>{copy.aiDraftGenerating}</span>
                </div>
              )}
              {replyDecision?.mode === "send" && (
                <div className="mb-2">
                  <InboxReplyDecision decision={replyDecision} />
                </div>
              )}
              {replyDecision?.mode === "draft" && !!thread.pendingDraft?.suggestion && (
                <div className="mb-2">
                  <InboxReplyDecision decision={replyDecision} hasDraft />
                </div>
              )}
              <InboxComposer
                draft={draft}
                onDraftChange={(text) => {
                  draftDirtyRef.current = true;
                  setDraft(text);
                }}
                onSend={handleSend}
                sendPending={sendPending}
                sendDisabled={!thread.whatsappAccount.isActive || windowClosed || !canSend}
                sendError={sendError}
                showAiSuggest={
                  !!capabilities?.aiSuggestReply &&
                  !thread.aiEnabled &&
                  !windowClosed &&
                  !attachment
                }
                suggestPending={suggestMutation.isPending}
                onSuggest={() => suggestMutation.mutate()}
                templates={
                  thread.pendingDraft?.suggestion ? undefined : replyTemplates?.templates
                }
                composeRef={composeRef}
                draftNote={
                  thread.aiEnabled && thread.pendingDraft?.suggestion
                    ? copy.aiDraftReady
                    : undefined
                }
                attachment={
                  attachment
                    ? {
                        name: attachment.file.name,
                        previewUrl: attachment.previewUrl,
                        kind: INBOX_IMAGE_MIMES.has(attachment.file.type)
                          ? "image"
                          : "document",
                      }
                    : null
                }
                onAttachFile={handleAttachFile}
                onTyping={emitTyping}
                onClearAttachment={clearAttachment}
                attachInputRef={attachInputRef}
                showTranslate={!!capabilities?.aiSuggestReply}
                translatePending={translateMutation.isPending}
                onTranslateDraft={(target) => translateMutation.mutate(target)}
              />
            </div>
          </div>

          {thread.lead && (
            <div className="shrink-0 border-t border-border/80 bg-card px-4 py-3 lg:hidden">
              <button
                type="button"
                className="mb-2 text-xs font-semibold text-accent"
                onClick={toggleInsightsPanel}
              >
                {showTimeline ? "Hide activity" : "Show activity & stage history"}
              </button>
              {showTimeline && (
                <>
                  {(thread.aiContext?.customerNeeds?.length ?? 0) > 0 && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {copy.timelineCustomerNeeds}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {thread.aiContext!.customerNeeds!.map((need) => (
                          <span
                            key={need}
                            className="rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-medium"
                          >
                            {need}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
                    {(timeline?.events ?? []).slice(0, 12).map((ev) => (
                      <li key={ev.id} className="border-b border-border/40 pb-2 last:border-0">
                        <p className="font-medium text-foreground">{ev.title}</p>
                        {ev.detail && <p className="mt-0.5 text-muted-foreground">{ev.detail}</p>}
                      </li>
                    ))}
                    {(timeline?.events?.length ?? 0) === 0 && (
                      <li className="text-muted-foreground">
                        No activity yet — AI runs when messages arrive.
                      </li>
                    )}
                  </ul>
                  {thread.lead?.id && (
                    <div className="mt-3">
                      <InboxInternalNotes
                        leadId={thread.lead.id}
                        canEdit={canSend}
                        canDeleteAny={canManageTeam(role)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {thread.lead && (
          <InboxTimeline
            className="hidden lg:flex"
            events={timeline?.events ?? []}
            aiConfidence={timeline?.lead.aiConfidence}
            hasClassification={!!thread.aiContext}
            workingMemory={inboxContext?.workingMemory}
            customerNeeds={thread.aiContext?.customerNeeds}
            leadId={thread.lead.id}
            canEditNotes={canSend}
            canDeleteAnyNotes={canManageTeam(role)}
            aiBrief={
              thread.aiContext?.summary
                ? {
                    summary: thread.aiContext.summary,
                    nextAction: thread.aiContext.nextAction,
                    intent: thread.aiContext.intent,
                  }
                : null
            }
            open={showTimeline}
            onToggle={toggleInsightsPanel}
          />
        )}
      </div>

      <LostReasonDialog
        open={lostPrompt}
        leadName={thread.contactName}
        loading={stageMutation.isPending}
        onCancel={() => setLostPrompt(false)}
        onConfirm={(reason) => {
          stageMutation.mutate({ stage: "LOST", reason }, { onSuccess: () => setLostPrompt(false) });
        }}
      />
      <WonReasonDialog
        open={wonPrompt}
        leadName={thread.contactName}
        loading={stageMutation.isPending}
        onCancel={() => setWonPrompt(false)}
        onConfirm={(reason) => {
          stageMutation.mutate({ stage: "WON", reason }, { onSuccess: () => setWonPrompt(false) });
        }}
      />
      {lightboxMessageId && lightboxUrl && (
        <InboxImageLightbox
          src={lightboxUrl}
          alt={lightboxMessage?.content ?? "WhatsApp attachment"}
          onClose={() => setLightboxMessageId(null)}
          onPrev={
            lightboxIndex > 0
              ? () => setLightboxMessageId(imageMessageIds[lightboxIndex - 1]!)
              : undefined
          }
          onNext={
            lightboxIndex >= 0 && lightboxIndex < imageMessageIds.length - 1
              ? () => setLightboxMessageId(imageMessageIds[lightboxIndex + 1]!)
              : undefined
          }
          onDownload={
            lightboxMessage
              ? async () => {
                  await downloadInboxMessageMedia(
                    conversationId,
                    lightboxMessageId,
                    inferInboxMediaFilename(
                      lightboxMessage.content,
                      lightboxMessage.type ?? "IMAGE",
                      lightboxMessageId,
                    ),
                  );
                }
              : undefined
          }
        />
      )}
      {pendingHandoff && thread && (
        <InboxHandoffPackageDialog
          open
          onOpenChange={(open) => {
            if (!open) setPendingHandoff(null);
          }}
          assigneeName={pendingHandoff.name}
          contactLabel={thread.contactName ?? thread.contactPhone}
          stageLabel={thread.lead ? copy.stageLabel(thread.lead.stage) : undefined}
          dealValueCents={thread.lead?.valueCents}
          aiContext={thread.aiContext ?? null}
          recentSnippet={recentCustomerSnippet}
          pending={assignMutation.isPending}
          onConfirm={() => {
            assignMutation.mutate(pendingHandoff.userId, {
              onSuccess: () => setPendingHandoff(null),
            });
          }}
        />
      )}
      {followUpExcerpt !== null && thread && (
        <InboxFollowUpDialog
          open
          onOpenChange={(open) => {
            if (!open) setFollowUpExcerpt(null);
          }}
          contactLabel={thread.contactName ?? thread.contactPhone}
          excerpt={followUpExcerpt}
          pending={followUpMutation.isPending}
          onConfirm={(preset) =>
            followUpMutation.mutate({ preset, excerpt: followUpExcerpt })
          }
        />
      )}
    </>
  );
}

export const InboxThreadPane = memo(InboxThreadPaneInner);
