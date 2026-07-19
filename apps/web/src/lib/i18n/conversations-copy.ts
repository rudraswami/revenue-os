"use client";

import { useMemo } from "react";
import { formatMessage } from "./format-message";
import { useI18n } from "./locale-provider";

export type InboxListFilter = "all" | "handoff" | "unread" | "unassigned" | "mine";
export type InboxListScope = "active" | "closed";

export function useConversationsCopy() {
  const { locale, t } = useI18n();

  return useMemo(
    () => ({
      locale,
      yourTurn: t("conversations.yourTurn"),
      waitingOnYou: t("conversations.waitingOnYou"),
      yourTurnClear: t("conversations.yourTurnClear"),
      yourTurnHint: t("conversations.yourTurnHint"),
      seeWhoWaiting: t("conversations.seeWhoWaiting"),
      openConversations: t("conversations.openConversations"),
      needsYouTitle: (reason?: string | null) =>
        reason
          ? formatMessage(t("conversations.needsYouWithReason"), { reason })
          : t("conversations.needsYou"),
      replyNow: t("conversations.replyNow"),
      alreadyHandled: t("conversations.alreadyHandled"),
      replyNowHint: t("conversations.replyNowHint"),
      coachTakeoverHint: t("conversations.coachTakeoverHint"),
      aiFixClassification: t("conversations.aiFixClassification"),
      aiFixCancel: t("conversations.aiFixCancel"),
      aiFixTitle: t("conversations.aiFixTitle"),
      aiFixHint: t("conversations.aiFixHint"),
      aiFixStage: t("conversations.aiFixStage"),
      aiFixScore: t("conversations.aiFixScore"),
      aiFixIntent: t("conversations.aiFixIntent"),
      aiFixNeedsYou: t("conversations.aiFixNeedsYou"),
      aiFixNote: t("conversations.aiFixNote"),
      aiFixNotePlaceholder: t("conversations.aiFixNotePlaceholder"),
      aiFixSave: t("conversations.aiFixSave"),
      aiFixSaving: t("conversations.aiFixSaving"),
      aiCorrected: t("conversations.aiCorrected"),
      composePlaceholder: t("conversations.composePlaceholder"),
      composeFooter: t("conversations.composeFooter"),
      composeCollapsed: t("conversations.composeCollapsed"),
      selectTitle: t("conversations.selectTitle"),
      selectBody: t("conversations.selectBody"),
      autoClassify: t("conversations.autoClassify"),
      illHandleThis: t("conversations.illHandleThis"),
      letGrowvisiHelp: t("conversations.letGrowvisiHelp"),
      handlingThisThread: t("conversations.handlingThisThread"),
      replyModeHuman: t("conversations.replyModeHuman"),
      replyModeAiAssist: t("conversations.replyModeAiAssist"),
      replyModeHint: t("conversations.replyModeHint"),
      aiDraftReady: t("conversations.aiDraftReady"),
      aiDraftNote: t("conversations.aiDraftNote"),
      aiDraftGenerating: t("conversations.aiDraftGenerating"),
      replyDraftFailed: t("conversations.replyDraftFailed"),
      replySkippedTitle: t("conversations.replySkippedTitle"),
      replyDraftPlanned: t("conversations.replyDraftPlanned"),
      replyDraftHeldTitle: t("conversations.replyDraftHeldTitle"),
      replyDraftBlockedFallback: t("conversations.replyDraftBlockedFallback"),
      replyAutoSentTitle: t("conversations.replyAutoSentTitle"),
      sendAiDraft: t("conversations.sendAiDraft"),
      assignedTo: t("conversations.assignedTo"),
      unassigned: t("conversations.unassigned"),
      scoreHot: (n: number) => formatMessage(t("conversations.scoreHot"), { n }),
      scoreWarm: (n: number) => formatMessage(t("conversations.scoreWarm"), { n }),
      viewOnPipeline: t("conversations.viewOnPipeline"),
      dealValue: (amount: string) => formatMessage(t("conversations.dealValue"), { amount }),
      dealClosed: (amount: string) => formatMessage(t("conversations.dealClosed"), { amount }),
      addDealValue: t("conversations.addDealValue"),
      composeTitle: t("conversations.composeTitle"),
      draftWithAi: t("conversations.draftWithAi"),
      drafting: t("conversations.drafting"),
      minimizeComposer: t("conversations.minimizeComposer"),
      sendReply: t("conversations.sendReply"),
      timelineTitle: t("conversations.timelineTitle"),
      timelineSubtitle: t("conversations.timelineSubtitle"),
      timelineConfidence: t("conversations.timelineConfidence"),
      timelineEmptyClassify: t("conversations.timelineEmptyClassify"),
      timelineEmptyEvents: t("conversations.timelineEmptyEvents"),
      filterAll: t("conversations.filterAll"),
      filterUnread: t("conversations.filterUnread"),
      filterUnassigned: t("conversations.filterUnassigned"),
      filterMine: t("conversations.filterMine"),
      dailyQueueTitle: t("conversations.dailyQueueTitle"),
      dailyQueueHint: t("conversations.dailyQueueHint"),
      nextInQueue: t("conversations.nextInQueue"),
      scopeActive: t("conversations.scopeActive"),
      scopeClosed: t("conversations.scopeClosed"),
      newMessage: t("conversations.newMessage"),
      newOutboundTitle: t("conversations.newOutboundTitle"),
      newOutboundHint: t("conversations.newOutboundHint"),
      outboundPhoneLabel: t("conversations.outboundPhoneLabel"),
      outboundPhoneHint: t("conversations.outboundPhoneHint"),
      outboundNameLabel: t("conversations.outboundNameLabel"),
      outboundMessageType: t("conversations.outboundMessageType"),
      outboundModeTemplate: t("conversations.outboundModeTemplate"),
      outboundModeTemplateHint: t("conversations.outboundModeTemplateHint"),
      outboundModeSession: t("conversations.outboundModeSession"),
      outboundModeSessionHint: t("conversations.outboundModeSessionHint"),
      outboundTemplateVarLabel: t("conversations.outboundTemplateVarLabel"),
      outboundTemplateVarHint: t("conversations.outboundTemplateVarHint"),
      outboundFreeTextLabel: t("conversations.outboundFreeTextLabel"),
      outboundFreeTextHint: t("conversations.outboundFreeTextHint"),
      searchPlaceholder: t("conversations.searchPlaceholder"),
      conversationCount: (n: number) =>
        n === 1
          ? formatMessage(t("conversations.conversationCountOne"), { n })
          : formatMessage(t("conversations.conversationCount"), { n }),
      stageLabel: (stage: string) => {
        const key = `conversations.stages.${stage}`;
        const label = t(key);
        return label === key ? stage : label;
      },
      emptyCaughtUp: t("conversations.emptyCaughtUp"),
      emptyUnread: t("conversations.emptyUnread"),
      emptyUnassigned: t("conversations.emptyUnassigned"),
      emptyMine: t("conversations.emptyMine"),
      emptyClosed: t("conversations.emptyClosed"),
      emptyActive: t("conversations.emptyActive"),
      emptyFilterHint: t("conversations.emptyFilterHint"),
      emptyStartHint: t("conversations.emptyStartHint"),
      whatsappNotConnected: t("conversations.whatsappNotConnected"),
      whatsappNotConnectedHint: t("conversations.whatsappNotConnectedHint"),
      connectWhatsapp: t("conversations.connectWhatsapp"),
      live: t("conversations.live"),
      messagingEyebrow: t("conversations.messagingEyebrow"),
      humanizeDetail: (detail?: string) => {
        if (!detail) return undefined;
        const map: Record<string, string> = {
          "Updated from Conversations": "conversations.detailUpdatedConversations",
          "Updated from Pipeline": "conversations.detailUpdatedPipeline",
          "Team notified about stale conversation": "conversations.detailStaleNotify",
        };
        const path = map[detail];
        return path ? t(path) : detail;
      },
      timelineHeadline: {
        aiReviewed: t("conversations.timelineHeadline.aiReviewed"),
        hotLeadAlert: t("conversations.timelineHeadline.hotLeadAlert"),
        followupReminder: t("conversations.timelineHeadline.followupReminder"),
        autoMovedTo: (stage: string) =>
          formatMessage(t("conversations.timelineHeadline.autoMovedTo"), { stage }),
        setTo: (stage: string) =>
          formatMessage(t("conversations.timelineHeadline.setTo"), { stage }),
        moved: (from: string, to: string) =>
          formatMessage(t("conversations.timelineHeadline.moved"), { from, to }),
      },
    }),
    [locale, t],
  );
}

export type ConversationsCopy = ReturnType<typeof useConversationsCopy>;
