import { ConfigService } from "@nestjs/config";
import { MESSAGE_TEMPLATE_STARTERS } from "@growvisi/shared";
import { WhatsappMessagingService } from "./whatsapp-messaging.service";

jest.mock("../../common/crypto/token-cipher", () => ({
  decryptSecret: jest.fn(() => "test-token"),
}));

jest.mock("../../common/http/fetch-with-timeout", () => ({
  fetchWithTimeout: jest.fn(),
}));

import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";

describe("WhatsappMessagingService message templates", () => {
  const config = {
    get: jest.fn((key: string) => (key === "WHATSAPP_API_VERSION" ? "v21.0" : undefined)),
  } as unknown as ConfigService;

  const service = new WhatsappMessagingService(config);
  const fetchMock = fetchWithTimeout as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "tpl_123", status: "PENDING" }),
    });
  });

  it("includes Meta body_text examples on create for any template with variables", async () => {
    const starter = MESSAGE_TEMPLATE_STARTERS.find((s) => s.id === "appointment_reminder")!;

    await service.createMessageTemplate("waba_1", "enc", {
      name: "appointment_reminder_ab12",
      language: starter.language,
      category: starter.category,
      body: starter.body,
      variableHints: starter.variableHints,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));

    expect(payload.parameter_format).toBe("positional");
    expect(payload.components[0].type).toBe("BODY");
    expect(payload.components[0].text).toBe(starter.body);
    expect(payload.components[0].example).toEqual({
      body_text: [starter.variableHints],
    });
  });

  it("includes Meta body_text examples on update", async () => {
    const body = "Hi {{1}}, thanks for contacting {{2}} today.";

    await service.updateMessageTemplate("tpl_99", "enc", {
      body,
      category: "UTILITY",
      variableHints: ["Customer name", "Business name"],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));

    expect(payload.components[0].example).toEqual({
      body_text: [["Customer name", "Business name"]],
    });
  });

  it("omits example when body has no variables", async () => {
    await service.createMessageTemplate("waba_1", "enc", {
      name: "plain_notice",
      language: "en",
      category: "UTILITY",
      body: "We are open today from 9 AM to 6 PM. Reply if you need help.",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));

    expect(payload.components[0].example).toBeUndefined();
  });
});
