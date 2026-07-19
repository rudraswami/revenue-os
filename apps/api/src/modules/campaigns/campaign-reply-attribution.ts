import type { Prisma } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";

/** How long after a template send we still attribute an inbound reply to that campaign. */
export const CAMPAIGN_REPLY_ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60_000;

export interface CampaignAttributionMeta {
  campaignId: string;
  campaignName: string;
  recipientId: string;
  attributedAt: string;
  trigger: "inbound_reply";
}

export function normalizeCampaignPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function phonesMatch(stored: string, inbound: string): boolean {
  const a = normalizeCampaignPhone(stored);
  const b = normalizeCampaignPhone(inbound);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 10 && b.length >= 10) {
    return a.slice(-10) === b.slice(-10);
  }
  return false;
}

export function parseCampaignAttributionMeta(
  metadata: unknown,
): CampaignAttributionMeta | null {
  if (!metadata || typeof metadata !== "object") return null;
  const root = metadata as Record<string, unknown>;
  const raw = root.campaignAttribution;
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.campaignId !== "string" || typeof m.campaignName !== "string") {
    return null;
  }
  return {
    campaignId: m.campaignId,
    campaignName: m.campaignName,
    recipientId: typeof m.recipientId === "string" ? m.recipientId : "",
    attributedAt: typeof m.attributedAt === "string" ? m.attributedAt : "",
    trigger: "inbound_reply",
  };
}

export function withCampaignAttributionMeta(
  metadata: Prisma.JsonValue | null | undefined,
  attribution: CampaignAttributionMeta,
): Prisma.InputJsonValue {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  return {
    ...base,
    campaignAttribution: attribution as unknown as Prisma.InputJsonValue,
  } as Prisma.InputJsonValue;
}

/**
 * Links an inbound WhatsApp reply to the most recent eligible campaign recipient.
 * First reply per recipient wins; conversation metadata is updated for inbox UI.
 */
export async function attributeInboundCampaignReply(
  prisma: PrismaService,
  input: {
    organizationId: string;
    whatsappAccountId: string;
    contactPhone: string;
    conversationId: string;
    messageId: string;
    leadId?: string | null;
  },
): Promise<CampaignAttributionMeta | null> {
  const normalizedPhone = normalizeCampaignPhone(input.contactPhone);
  if (normalizedPhone.length < 10) return null;

  const windowStart = new Date(Date.now() - CAMPAIGN_REPLY_ATTRIBUTION_WINDOW_MS);

  const candidates = await prisma.campaignRecipient.findMany({
    where: {
      repliedAt: null,
      status: { in: ["SENT", "DELIVERED", "READ"] },
      sentAt: { gte: windowStart },
      campaign: {
        organizationId: input.organizationId,
        status: { in: ["RUNNING", "COMPLETED"] },
        OR: [
          { whatsappAccountId: input.whatsappAccountId },
          { whatsappAccountId: null },
        ],
      },
    },
    orderBy: { sentAt: "desc" },
    take: 20,
    select: {
      id: true,
      phone: true,
      campaignId: true,
      campaign: { select: { id: true, name: true } },
    },
  });

  const recipient = candidates.find((r) => phonesMatch(r.phone, normalizedPhone));
  if (!recipient) return null;

  const attributedAt = new Date().toISOString();
  const attribution: CampaignAttributionMeta = {
    campaignId: recipient.campaign.id,
    campaignName: recipient.campaign.name,
    recipientId: recipient.id,
    attributedAt,
    trigger: "inbound_reply",
  };

  const updated = await prisma.campaignRecipient.updateMany({
    where: { id: recipient.id, repliedAt: null },
    data: {
      repliedAt: new Date(attributedAt),
      conversationId: input.conversationId,
      replyMessageId: input.messageId,
    },
  });

  if (updated.count === 0) return null;

  await prisma.campaign.update({
    where: { id: recipient.campaignId },
    data: { replyCount: { increment: 1 } },
  });

  const conversation = await prisma.conversation.findUnique({
    where: { id: input.conversationId },
    select: { metadata: true },
  });

  const existing = parseCampaignAttributionMeta(conversation?.metadata);
  if (!existing) {
    await prisma.conversation.update({
      where: { id: input.conversationId },
      data: {
        metadata: withCampaignAttributionMeta(conversation?.metadata, attribution),
      },
    });
  }

  if (input.leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      select: { source: true },
    });
    if (lead && !lead.source?.trim()) {
      await prisma.lead.update({
        where: { id: input.leadId },
        data: { source: `campaign:${recipient.campaign.name}` },
      });
    }
  }

  return attribution;
}
