import { WhatsappTemplateSyncService } from "./whatsapp-template-sync.service";
import { WhatsappMessagingService } from "./whatsapp-messaging.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

describe("WhatsappTemplateSyncService", () => {
  const prisma = {
    whatsappAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    organizationMember: {
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  const messaging = {
    listMessageTemplates: jest.fn(),
    createMessageTemplate: jest.fn(),
  } as unknown as WhatsappMessagingService;

  const entitlements = {
    assertPlanAtLeast: jest.fn(),
  } as unknown as EntitlementsService;

  const realtime = {
    emitTemplatesUpdated: jest.fn(),
  } as unknown as RealtimeGateway;

  const service = new WhatsappTemplateSyncService(prisma, messaging, entitlements, realtime);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.whatsappAccount.update as jest.Mock).mockResolvedValue({});
    (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({
      user: { locale: "en" },
    });
  });

  it("syncs template counts into account metadata", async () => {
    (prisma.whatsappAccount.findUnique as jest.Mock).mockResolvedValue({
      id: "wa_1",
      wabaId: "waba_1",
      accessTokenEnc: "enc",
      metadata: {},
    });
    (messaging.listMessageTemplates as jest.Mock).mockResolvedValue([
      { status: "APPROVED" },
      { status: "PENDING" },
    ]);

    const result = await service.syncAccountTemplates("wa_1");

    expect(result).toEqual({
      templateCount: 2,
      approvedTemplateCount: 1,
      pendingTemplateCount: 1,
    });
    expect(prisma.whatsappAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wa_1" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            templateCount: 2,
            approvedTemplateCount: 1,
            pendingTemplateCount: 1,
          }),
        }),
      }),
    );
  });

  it("handles template status webhook, re-syncs, and emits realtime", async () => {
    (prisma.whatsappAccount.findMany as jest.Mock).mockResolvedValue([
      { id: "wa_1", organizationId: "org_1", metadata: {} },
    ]);
    (prisma.whatsappAccount.findUnique as jest.Mock).mockResolvedValue({
      id: "wa_1",
      wabaId: "waba_1",
      accessTokenEnc: "enc",
      metadata: {},
    });
    (messaging.listMessageTemplates as jest.Mock).mockResolvedValue([
      { status: "APPROVED" },
    ]);

    await service.handleTemplateStatusUpdate("waba_1", {
      event: "APPROVED",
      messageTemplateName: "followup_offer",
      messageTemplateLanguage: "en",
    });

    expect(prisma.whatsappAccount.update).toHaveBeenCalled();
    expect(messaging.listMessageTemplates).toHaveBeenCalled();
    expect(realtime.emitTemplatesUpdated).toHaveBeenCalledWith("org_1", {
      event: "APPROVED",
      templateName: "followup_offer",
      language: "en",
    });
  });

  it("auto-provisions English starter when WABA has zero templates on Growth+", async () => {
    (entitlements.assertPlanAtLeast as jest.Mock).mockResolvedValue(undefined);
    (prisma.whatsappAccount.findUnique as jest.Mock).mockResolvedValue({
      id: "wa_1",
      wabaId: "waba_1",
      accessTokenEnc: "enc",
      metadata: {},
    });
    (messaging.listMessageTemplates as jest.Mock).mockResolvedValue([]);
    (messaging.createMessageTemplate as jest.Mock).mockResolvedValue({
      name: "followup_inquiry_ab12",
      status: "PENDING",
    });

    await service.provisionDefaultStarterIfNeeded("wa_1", "org_1");

    expect(messaging.createMessageTemplate).toHaveBeenCalledWith(
      "waba_1",
      "enc",
      expect.objectContaining({
        category: "UTILITY",
        language: "en",
      }),
    );
    expect(prisma.whatsappAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            starterTemplatesProvisioned: true,
            starterTemplatesProvisionOutcome: "submitted",
          }),
        }),
      }),
    );
  });

  it("auto-provisions Hindi starter when owner locale is hi", async () => {
    (entitlements.assertPlanAtLeast as jest.Mock).mockResolvedValue(undefined);
    (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({
      user: { locale: "hi" },
    });
    (prisma.whatsappAccount.findUnique as jest.Mock).mockResolvedValue({
      id: "wa_1",
      wabaId: "waba_1",
      accessTokenEnc: "enc",
      metadata: {},
    });
    (messaging.listMessageTemplates as jest.Mock).mockResolvedValue([]);
    (messaging.createMessageTemplate as jest.Mock).mockResolvedValue({
      name: "followup_hi_ab12",
      status: "PENDING",
    });

    await service.provisionDefaultStarterIfNeeded("wa_1", "org_1");

    expect(messaging.createMessageTemplate).toHaveBeenCalledWith(
      "waba_1",
      "enc",
      expect.objectContaining({
        language: "hi",
      }),
    );
  });

  it("skips auto-provision when templates already exist", async () => {
    (entitlements.assertPlanAtLeast as jest.Mock).mockResolvedValue(undefined);
    (prisma.whatsappAccount.findUnique as jest.Mock).mockResolvedValue({
      id: "wa_1",
      wabaId: "waba_1",
      accessTokenEnc: "enc",
      metadata: {},
    });
    (messaging.listMessageTemplates as jest.Mock).mockResolvedValue([{ status: "APPROVED" }]);

    await service.provisionDefaultStarterIfNeeded("wa_1", "org_1");

    expect(messaging.createMessageTemplate).not.toHaveBeenCalled();
    expect(prisma.whatsappAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            starterTemplatesProvisionOutcome: "skipped_has_templates",
          }),
        }),
      }),
    );
  });
});
