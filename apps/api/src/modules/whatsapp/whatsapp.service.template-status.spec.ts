import { WhatsappService, type WhatsappWebhookPayload } from "./whatsapp.service";

describe("WhatsappService template status webhook", () => {
  const templateSync = {
    handleTemplateStatusUpdate: jest.fn(),
  };

  const makeService = () =>
    new WhatsappService(
      {} as never,
      { get: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      templateSync as never,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    templateSync.handleTemplateStatusUpdate.mockResolvedValue(undefined);
  });

  it("routes message_template_status_update to template sync service", async () => {
    const service = makeService();
    const payload: WhatsappWebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba_123",
          changes: [
            {
              field: "message_template_status_update",
              value: {
                event: "APPROVED",
                message_template_id: 12345,
                message_template_name: "followup_offer",
                message_template_language: "en",
                message_template_category: "UTILITY",
              },
            },
          ],
        },
      ],
    };

    await service.processWebhookPayload(payload);

    expect(templateSync.handleTemplateStatusUpdate).toHaveBeenCalledWith("waba_123", {
      event: "APPROVED",
      messageTemplateId: 12345,
      messageTemplateName: "followup_offer",
      messageTemplateLanguage: "en",
      messageTemplateCategory: "UTILITY",
      reason: undefined,
      rejectionInfo: undefined,
    });
  });
});
