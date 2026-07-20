"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Reply } from "lucide-react";
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
import { InboxMessageBody } from "@/components/dashboard/inbox-message-body";
import { InboxComposer } from "@/components/dashboard/inbox-composer";
import { InboxOwnershipStrip } from "@/components/dashboard/inbox-ownership-strip";
import { InboxReplyDecision } from "@/components/dashboard/inbox-reply-decision";
import { InboxTimeline } from "@/components/dashboard/inbox-timeline";
import { LostReasonDialog } from "@/components/dashboard/lost-reason-dialog";
import { WonReasonDialog } from "@/components/dashboard/won-reason-dialog";
import { InboxThreadDetailsMobile } from "@/components/dashboard/inbox-thread-details-mobile";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { apiFetch, apiUpload, toUserMessage } from "@/lib/api-client";
import { measureInteraction, startInteraction } from "@/lib/performance";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import {
  useShellConversationCapabilities,
  useShellOnboardingCoaching,
} from "@/hooks/use-shell-data";
import { useToast } from "@/components/ui/toast";
import { useVisibleRefetchInterval } from "@/hooks/use-visible-refetch-interval";
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
  shouldAutoOpenInboxInsights,
} from "@/lib/inbox-insights-preference";
import { formatQuotedReply } from "@/lib/inbox-composer-helpers";
import { InboxInternalNotes } from "@/components/dashboard/inbox-internal-notes";

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  content: string | null;
  createdAt: string;
  status: string;
  sentByAi?: boolean;
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
  const canSend = canWrite(role);
  const canAssignOthers = canAssignWork(role);
  const canEditAssignmentRules = canAssignOthers || canManageTeam(role);
  const canTakeOver = canAssignToSelf(role);
  const canToggleAi = canToggleInboxAi(role);
  const queryClient = useQueryClient();
  const { connected: live } = useRealtime();
  const threadPollInterval = useVisibleRefetchInterval(live ? false : 4_000);
  const timelinePollInterval = useVisibleRefetchInterval(live ? false : 12_000);
  const { error: toastError } = useToast();
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const threadOpenMarkRef = useRef<string | null>(null);
  const threadOpenStartedRef = useRef<Record<string, number>>({});
  const scrollSmoothRef = useRef(false);
  const insightsAutoOpenedRef = useRef<string | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{
    file: File;
    previewUrl?: string;
  } | null>(null);
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
    const saved = loadInboxDraft(conversationId);
    setDraft(saved?.text ?? "");
    setDraftMeta(saved?.meta ?? null);
    setSendError(null);
    setHasOlderOverride(null);
    insightsAutoOpenedRef.current = null;
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
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: scrollSmoothRef.current ? "smooth" : "auto",
    });
    scrollSmoothRef.current = false;
  }, [lastMsgId, conversationId]);

  useEffect(() => {
    saveInboxDraft(conversationId, { text: draft, meta: draftMeta });
  }, [conversationId, draft, draftMeta]);

  useEffect(() => {
    if (!thread?.lead) return;
    if (insightsAutoOpenedRef.current === conversationId) return;
    if (
      shouldAutoOpenInboxInsights({
        requiresHuman: thread.requiresHuman,
        aiConfidence: thread.lead.aiConfidence,
        valueCents: thread.lead.valueCents,
      })
    ) {
      insightsAutoOpenedRef.current = conversationId;
      setShowTimeline(true);
      saveInboxInsightsOpen(true);
    }
  }, [conversationId, thread?.lead, thread?.requiresHuman]);

  useEffect(() => {
    if (thread?.requiresHuman) composeRef.current?.focus();
  }, [thread?.requiresHuman, thread?.id]);

  useEffect(() => {
    const pending = thread?.pendingDraft;
    if (!pending?.suggestion || !thread?.aiEnabled) return;
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
      setDraft(res.suggestion);
      setDraftMeta({ aiRunId: res.aiRunId, sources: res.sources ?? [] });
      setSendError(null);
      invalidateInboxThreadQueries(queryClient, conversationId);
    },
    onError: (e) => {
      setSendError(toUserMessage(e, "Could not suggest a reply."));
    },
  });

  const aiToggleMutation = useMutation({
    mutationFn: (aiEnabled: boolean) =>
      apiFetch<ConversationDetail>(`/conversations/${conversationId}/ai`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ aiEnabled }),
      }),
    onSuccess: (updated) => {
      syncInboxThreadBundleConversation(queryClient, conversationId, updated);
    },
    onError: (e) => showMutationError(e, "Could not update AI settings."),
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

  const awaitingAiDraft =
    !!thread?.aiEnabled &&
    !thread?.pendingDraft?.suggestion &&
    !suggestMutation.isPending &&
    !aiToggleMutation.isPending &&
    lastMessage?.direction === "INBOUND" &&
    !classifySettled &&
    lastInboundMs > 0 &&
    Date.now() - lastInboundMs < 120_000;

  const assignMutation = useMutation({
    mutationFn: (assignToUserId: string | null) =>
      apiFetch<ConversationDetail>(`/conversations/${conversationId}/assign`, {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({ assignToUserId }),
      }),
    onSuccess: (updated) => {
      syncInboxThreadBundleConversation(queryClient, conversationId, updated);
      refreshQueueStats(queryClient);
    },
    onError: (e) => showMutationError(e, "Could not assign this conversation."),
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
    }: {
      content: string;
      draftText?: string;
      aiRunId?: string;
    }) =>
      apiFetch<InboxThreadMessage>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ content, draftText, aiRunId }),
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
    onSuccess: (serverMessage) => {
      scrollSmoothRef.current = true;
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
    onError: (e) => {
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

  function quoteInboundMessage(content: string | null) {
    const quote = formatQuotedReply(content ?? "");
    if (!quote) return;
    setDraft((prev) => quote + prev);
    composeRef.current?.focus();
  }

  if (threadLoading && !thread) {
    return <InboxThreadSkeleton />;
  }

  if (threadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-destructive">{copy.threadLoadError}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refetchThread()}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
          >
            {copy.threadRetry}
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            {copy.threadBackToList}
          </button>
        </div>
      </div>
    );
  }

  if (!thread) return null;

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
                                  ? "bg-emerald-50 text-emerald-800"
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
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
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
              onAssign={(userId) => assignMutation.mutate(userId)}
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
            <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-background/60 px-4 py-1.5 lg:px-5">
              <div className="hidden items-center gap-2 rounded-lg border border-border/50 bg-card px-2.5 py-1 md:flex">
                <label htmlFor="assign-agent" className="text-xs font-medium text-muted-foreground">
                  {copy.assignedTo}
                </label>
                {canAssignOthers ? (
                  <select
                    id="assign-agent"
                    className="max-w-[140px] truncate rounded-md border-0 bg-transparent text-xs font-medium focus:outline-none"
                    value={thread.assignedTo?.id ?? ""}
                    disabled={assignMutation.isPending}
                    onChange={(e) => {
                      const v = e.target.value;
                      assignMutation.mutate(v ? v : null);
                    }}
                  >
                    <option value="">{copy.unassigned}</option>
                    {(teamMembers ?? []).map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name ?? m.user.email}
                      </option>
                    ))}
                  </select>
                ) : canTakeOver && !thread.assignedTo?.id ? (
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="h-7 rounded-lg text-xs"
                    disabled={assignMutation.isPending}
                    onClick={() => myUserId && assignMutation.mutate(myUserId)}
                  >
                    {copy.assignedTo} me
                  </Button>
                ) : (
                  <span className="text-xs font-medium text-foreground">
                    {thread.assignedTo?.name ?? thread.assignedTo?.email ?? copy.unassigned}
                  </span>
                )}
              </div>
            </div>
            <InboxOwnershipStrip
              aiEnabled={thread.aiEnabled}
              canToggle={canToggleAi}
              togglePending={aiToggleMutation.isPending}
              onTakeOver={() => aiToggleMutation.mutate(false)}
              onLetAiAssist={() => aiToggleMutation.mutate(true)}
              assigneeLabel={thread.assignedTo?.name ?? thread.assignedTo?.email ?? undefined}
              className="hidden md:flex"
            />
          </div>

          <div className="conversation-thread-bg flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 custom-scrollbar lg:px-6">
            <div className="mx-auto mt-auto flex w-full max-w-3xl flex-col gap-2.5">
              {hasOlderMessages && (
                <div className="flex justify-center pb-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    disabled={loadingOlder}
                    onClick={() => void loadOlderMessages()}
                  >
                    {loadingOlder ? "Loading…" : "Load older messages"}
                  </Button>
                </div>
              )}
              {thread.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "group relative max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                    m.direction === "OUTBOUND"
                      ? "ml-auto rounded-br-md border border-emerald-200/60 bg-whatsapp-green text-foreground"
                      : "mr-auto rounded-bl-md border border-white/80 bg-card text-foreground",
                  )}
                >
                  {m.direction === "INBOUND" && canSend && !windowClosed && m.content && (
                    <button
                      type="button"
                      className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground opacity-0 shadow-sm transition hover:text-accent group-hover:opacity-100"
                      aria-label="Quote reply"
                      onClick={() => quoteInboundMessage(m.content)}
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <InboxMessageBody
                    conversationId={thread.id}
                    messageId={m.id}
                    type={m.type ?? "TEXT"}
                    content={m.content}
                  />
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1.5 text-xs",
                      m.direction === "OUTBOUND" ? "text-emerald-800/60" : "text-muted-foreground",
                    )}
                  >
                    {m.sentByAi && m.direction === "OUTBOUND" && (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                        AI
                      </span>
                    )}
                    <span>
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-6">
            <div className="mx-auto w-full max-w-3xl">
              {windowClosed && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
                  <p className="font-semibold">24-hour reply window closed</p>
                  <p className="mt-0.5 text-amber-900/90">
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
              <InboxComposer
                draft={draft}
                onDraftChange={setDraft}
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
                onClearAttachment={clearAttachment}
                attachInputRef={attachInputRef}
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
    </>
  );
}

export const InboxThreadPane = memo(InboxThreadPaneInner);
