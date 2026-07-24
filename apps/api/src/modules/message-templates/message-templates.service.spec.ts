import type { JwtPayload } from "@growvisi/shared";
import { BadRequestException } from "@nestjs/common";
import { MessageTemplatesService } from "./message-templates.service";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";
import { WhatsappTemplateSyncService } from "../whatsapp/whatsapp-template-sync.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";

describe("MessageTemplatesService", () => {
  const prisma = {
    whatsappAccount: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  const messaging = {
    listMessageTemplates: jest.fn(),
    createMessageTemplate: jest.fn(),
    updateMessageTemplate: jest.fn(),
    deleteMessageTemplate: jest.fn(),
  } as unknown as WhatsappMessagingService;

  const templateSync = {
    syncAccountTemplates: jest.fn(),
  } as unknown as WhatsappTemplateSyncService;

  const entitlements = {
    assertPlanAtLeast: jest.fn(),
  } as unknown as EntitlementsService;

  const service = new MessageTemplatesService(prisma, messaging, templateSync, entitlements);

  const user: JwtPayload = {
    sub: "user_1",
    organizationId: "org_1",
    role: "OWNER",
    email: "owner@test.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (entitlements.assertPlanAtLeast as jest.Mock).mockResolvedValue(undefined);
    (prisma.whatsappAccount.findFirst as jest.Mock).mockResolvedValue({
      id: "wa_1",
      wabaId: "waba_1",
      accessTokenEnc: "enc_token",
    });
  });

  it("lists starters without requiring WhatsApp", () => {
    const result = service.listStarters();
    expect(result.starters.length).toBeGreaterThan(0);
  });

  it("rejects create when template name is invalid", async () => {
    await expect(
      service.create(user, {
        name: "___",
        body: "Hello {{1}}, welcome to {{2}} today.",
        category: "UTILITY",
        language: "en",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates template and triggers sync", async () => {
    (messaging.createMessageTemplate as jest.Mock).mockResolvedValue({
      name: "followup_offer_v1",
      language: "en",
      status: "PENDING",
      bodyPreview: "Hi",
      bodyText: "Hi {{1}}",
      bodyVariableCount: 1,
    });

    const result = await service.create(user, {
      name: "followup_offer_v1",
      body: "Hello {{1}}, thanks for contacting {{2}} today.",
      category: "UTILITY",
      language: "en",
      starterId: "followup_inquiry",
    });

    expect(messaging.createMessageTemplate).toHaveBeenCalledWith(
      "waba_1",
      "enc_token",
      expect.objectContaining({
        variableHints: ["Customer name", "Business name"],
      }),
    );
    expect(templateSync.syncAccountTemplates).toHaveBeenCalledWith("wa_1");
    expect(result.message).toContain("submitted");
  });

  it("updates rejected template and resubmits to Meta", async () => {
    (messaging.listMessageTemplates as jest.Mock).mockResolvedValue([
      {
        name: "followup_offer",
        language: "en",
        status: "REJECTED",
        category: "UTILITY",
        bodyText: "Old body {{1}}",
        bodyPreview: "Old body",
        bodyVariableCount: 1,
        metaTemplateId: "tpl_1",
      },
    ]);
    (messaging.updateMessageTemplate as jest.Mock).mockResolvedValue({
      name: "followup_offer",
      language: "en",
      status: "PENDING",
      category: "UTILITY",
      bodyText: "Hello {{1}}, thanks for contacting {{2}} today.",
      bodyPreview: "Hello",
      bodyVariableCount: 2,
      metaTemplateId: "tpl_1",
    });

    const result = await service.update(user, {
      name: "followup_offer",
      language: "en",
      metaTemplateId: "tpl_1",
      body: "Hello {{1}}, thanks for contacting {{2}} today.",
      category: "UTILITY",
    });

    expect(messaging.updateMessageTemplate).toHaveBeenCalledWith(
      "tpl_1",
      "enc_token",
      expect.objectContaining({
        body: "Hello {{1}}, thanks for contacting {{2}} today.",
        category: "UTILITY",
      }),
    );
    expect(templateSync.syncAccountTemplates).toHaveBeenCalledWith("wa_1");
    expect(result.message).toContain("review");
  });

  it("blocks category change on approved templates", async () => {
    (messaging.listMessageTemplates as jest.Mock).mockResolvedValue([
      {
        name: "followup_offer",
        language: "en",
        status: "APPROVED",
        category: "UTILITY",
        bodyText: "Hello {{1}}",
        bodyPreview: "Hello",
        bodyVariableCount: 1,
        metaTemplateId: "tpl_1",
      },
    ]);

    await expect(
      service.update(user, {
        name: "followup_offer",
        language: "en",
        metaTemplateId: "tpl_1",
        body: "Hello {{1}}, thanks for contacting {{2}} today.",
        category: "MARKETING",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("deletes template from Meta", async () => {
    (messaging.listMessageTemplates as jest.Mock).mockResolvedValue([
      {
        name: "followup_offer",
        language: "en",
        status: "REJECTED",
        bodyText: "Hello",
        bodyPreview: "Hello",
        bodyVariableCount: 0,
        metaTemplateId: "tpl_1",
      },
    ]);
    (messaging.deleteMessageTemplate as jest.Mock).mockResolvedValue(undefined);

    const result = await service.remove(user, {
      name: "followup_offer",
      language: "en",
      metaTemplateId: "tpl_1",
    });

    expect(messaging.deleteMessageTemplate).toHaveBeenCalledWith("waba_1", "enc_token", {
      name: "followup_offer",
      metaTemplateId: "tpl_1",
    });
    expect(result.ok).toBe(true);
  });
});
