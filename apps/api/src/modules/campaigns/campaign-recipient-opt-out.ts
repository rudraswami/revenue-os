import type { PrismaService } from "../prisma/prisma.service";
import {
  CAMPAIGN_SKIP_REASON_OPT_OUT,
  readCampaignOptOut,
} from "./campaign-opt-out";
import { normalizeCampaignPhone } from "./campaign-reply-attribution";

/** Phones opted out of WhatsApp broadcasts in this org. */
export async function loadOptedOutPhones(
  prisma: PrismaService,
  organizationId: string,
  phones: string[],
): Promise<Set<string>> {
  const normalized = [...new Set(phones.map(normalizeCampaignPhone).filter((p) => p.length >= 10))];
  if (normalized.length === 0) return new Set();

  const leads = await prisma.lead.findMany({
    where: { organizationId, phone: { in: normalized } },
    select: { phone: true, profile: true },
  });

  const optedOut = new Set<string>();
  for (const lead of leads) {
    if (readCampaignOptOut(lead.profile)) {
      optedOut.add(normalizeCampaignPhone(lead.phone));
    }
  }
  return optedOut;
}

export function recipientStatusForOptOut(
  phone: string,
  optedOutPhones: Set<string>,
): { status: "PENDING" | "SKIPPED"; error: string | null } {
  const key = normalizeCampaignPhone(phone);
  if (optedOutPhones.has(key)) {
    return { status: "SKIPPED", error: CAMPAIGN_SKIP_REASON_OPT_OUT };
  }
  return { status: "PENDING", error: null };
}
