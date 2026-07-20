import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import type { JwtPayload } from "@growvisi/shared";
import { GROWVISI_API_URL } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";

export interface TrackingLinkRow {
  id: string;
  name: string;
  slug: string;
  phone: string;
  prefilledText: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  clickCount: number;
  createdAt: Date;
}

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
  ) {}

  private async assertGrowthPlus(organizationId: string) {
    await this.entitlements.assertPlanAtLeast(organizationId, "growth");
  }

  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);
    return base || `link-${randomBytes(3).toString("hex")}`;
  }

  private trackBaseUrl(): string {
    const api =
      this.config.get<string>("API_URL")?.replace(/\/$/, "") ??
      (process.env.NODE_ENV === "production" ? GROWVISI_API_URL : "http://localhost:4000");
    return `${api}/api/v1/track`;
  }

  buildUrls(link: TrackingLinkRow) {
    const tracked = `${this.trackBaseUrl()}/${link.slug}`;
    const digits = link.phone.replace(/\D/g, "");
    const refToken = `[gv:${link.slug}]`;
    const text = [link.prefilledText?.trim(), refToken].filter(Boolean).join("\n\n");
    const waDirect = `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
    return { trackedUrl: tracked, waDirectUrl: waDirect };
  }

  async list(user: JwtPayload) {
    await this.assertGrowthPlus(user.organizationId);
    const rows = await this.prisma.trackingLink.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({ ...r, ...this.buildUrls(r) }));
  }

  async create(
    user: JwtPayload,
    input: {
      name: string;
      phone: string;
      prefilledText?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
    },
  ) {
    await this.assertGrowthPlus(user.organizationId);
    const name = input.name.trim();
    const phone = input.phone.replace(/\D/g, "");
    if (!name) throw new BadRequestException("Link name is required.");
    if (phone.length < 10) throw new BadRequestException("Valid phone number required.");

    let slug = this.slugify(name);
    const existing = await this.prisma.trackingLink.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${randomBytes(2).toString("hex")}`;

    const row = await this.prisma.trackingLink.create({
      data: {
        organizationId: user.organizationId,
        name: name.slice(0, 80),
        slug,
        phone,
        prefilledText: input.prefilledText?.trim().slice(0, 500) || null,
        utmSource: input.utmSource?.trim().slice(0, 80) || null,
        utmMedium: input.utmMedium?.trim().slice(0, 80) || null,
        utmCampaign: input.utmCampaign?.trim().slice(0, 80) || null,
        utmContent: input.utmContent?.trim().slice(0, 80) || null,
      },
    });

    return { ...row, ...this.buildUrls(row) };
  }

  async remove(user: JwtPayload, id: string) {
    await this.assertGrowthPlus(user.organizationId);
    const row = await this.prisma.trackingLink.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!row) throw new NotFoundException();
    await this.prisma.trackingLink.delete({ where: { id } });
    return { ok: true };
  }

  async redirect(slug: string) {
    const link = await this.prisma.trackingLink.findUnique({
      where: { slug },
    });
    if (!link) throw new NotFoundException("Link not found.");

    await this.prisma.trackingLink.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    });

    const { waDirectUrl } = this.buildUrls(link);
    return { redirectUrl: waDirectUrl, linkId: link.id };
  }

  async attributeLeadFromMessage(
    organizationId: string,
    leadId: string,
    messageContent: string | null | undefined,
    existingProfile: unknown,
  ) {
    const content = messageContent ?? "";
    const match = content.match(/\[gv:([a-z0-9_-]+)\]/i);
    if (!match) return;

    const slug = match[1].toLowerCase();
    const link = await this.prisma.trackingLink.findFirst({
      where: { organizationId, slug: slug.toLowerCase() },
    });
    if (!link) return;

    const profile =
      existingProfile && typeof existingProfile === "object"
        ? (existingProfile as Record<string, unknown>)
        : {};

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        source: link.utmCampaign ?? link.name ?? `link:${slug}`,
        profile: {
          ...profile,
          utm: {
            source: link.utmSource,
            medium: link.utmMedium,
            campaign: link.utmCampaign,
            content: link.utmContent,
            linkId: link.id,
            slug: link.slug,
            attributedAt: new Date().toISOString(),
          },
        } as object,
      },
    });
  }

  async metricsByCampaign(organizationId: string) {
    await this.assertGrowthPlus(organizationId);
    const leads = await this.prisma.lead.findMany({
      where: { organizationId },
      select: { profile: true, source: true, stage: true },
      take: 5000,
    });

    const counts = new Map<string, { leads: number; won: number }>();
    for (const lead of leads) {
      const profile = (lead.profile ?? {}) as Record<string, unknown>;
      const utm = (profile.utm ?? {}) as Record<string, unknown>;
      const campaign = String(utm.campaign ?? lead.source ?? "unknown");
      const row = counts.get(campaign) ?? { leads: 0, won: 0 };
      row.leads += 1;
      if (lead.stage === "WON") row.won += 1;
      counts.set(campaign, row);
    }

    return [...counts.entries()]
      .map(([campaign, stats]) => ({ campaign, ...stats }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 20);
  }
}
