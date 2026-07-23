import { Injectable } from "@nestjs/common";
import {
  CUSTOM_INDUSTRY_ID,
  profileHasHandbookPollution,
  resetHandbookDerivedProfile,
} from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { resolveIntelligenceSettings } from "../intelligence/workspace-intelligence-settings";
import { KnowledgeRetrievalService } from "./knowledge-retrieval.service";
import { KnowledgeService } from "./knowledge.service";

/**
 * Repairs custom/B2B workspaces polluted by industry handbook seed data.
 * Lives in KnowledgeModule so AiModule does not import OrganizationsModule
 * (that import created a WhatsappModule circular dependency on Vercel boot).
 */
@Injectable()
export class CustomIndustryRepairService {
  private readonly checked = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: KnowledgeService,
    private readonly knowledgeRetrieval: KnowledgeRetrievalService,
  ) {}

  async repairIfNeeded(organizationId: string): Promise<{
    profileRepaired: boolean;
    handbookDocsPurged: number;
    pricingDocsRenormalized: number;
  }> {
    if (this.checked.has(organizationId)) {
      return { profileRepaired: false, handbookDocsPurged: 0, pricingDocsRenormalized: 0 };
    }
    this.checked.add(organizationId);
    return this.repair(organizationId);
  }

  async repair(organizationId: string): Promise<{
    profileRepaired: boolean;
    handbookDocsPurged: number;
    pricingDocsRenormalized: number;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true, name: true },
    });
    if (!org) {
      return { profileRepaired: false, handbookDocsPurged: 0, pricingDocsRenormalized: 0 };
    }

    const settings = (org.settings ?? {}) as Record<string, unknown>;
    const current = resolveIntelligenceSettings(settings, org.name);
    if (current.industryId !== CUSTOM_INDUSTRY_ID) {
      return { profileRepaired: false, handbookDocsPurged: 0, pricingDocsRenormalized: 0 };
    }

    const handbookDocsPurged = await this.knowledge.purgeIndustryHandbookDocuments(
      organizationId,
    );
    const pricingDocsRenormalized =
      await this.knowledge.renormalizePricingDocuments(organizationId);

    const profilePolluted =
      current.businessProfile &&
      profileHasHandbookPollution(current.businessProfile);

    if (!profilePolluted && handbookDocsPurged === 0 && pricingDocsRenormalized === 0) {
      return { profileRepaired: false, handbookDocsPurged, pricingDocsRenormalized };
    }

    let profileRepaired = false;
    if (profilePolluted && current.businessProfile) {
      const resetProfile = resetHandbookDerivedProfile(org.name, current.businessProfile);
      const next = resolveIntelligenceSettings(
        {
          intelligence: {
            ...current,
            businessProfile: resetProfile,
          },
        },
        org.name,
      );
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          settings: {
            ...settings,
            intelligence: next,
          } as object,
        },
      });
      profileRepaired = true;
    }

    if (handbookDocsPurged > 0 || pricingDocsRenormalized > 0) {
      this.knowledgeRetrieval.invalidateChunkCountCache(organizationId);
    }

    return { profileRepaired, handbookDocsPurged, pricingDocsRenormalized };
  }
}
