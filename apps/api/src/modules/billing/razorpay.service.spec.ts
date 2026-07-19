import { createHmac } from "crypto";
import { ConfigService } from "@nestjs/config";
import { RazorpayService } from "./razorpay.service";

describe("RazorpayService.verifyWebhookSignature", () => {
  const secret = "test-webhook-secret-32chars-min";

  function serviceWithSecret(webhookSecret?: string) {
    const config = {
      get: (key: string) => {
        if (key === "RAZORPAY_WEBHOOK_SECRET") return webhookSecret;
        return undefined;
      },
    } as unknown as ConfigService;
    return new RazorpayService(config);
  }

  it("accepts valid HMAC signatures", () => {
    const body = JSON.stringify({ event: "subscription.activated" });
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    const service = serviceWithSecret(secret);
    expect(service.verifyWebhookSignature(body, signature)).toBe(true);
  });

  it("rejects invalid signatures", () => {
    const body = JSON.stringify({ event: "subscription.activated" });
    const service = serviceWithSecret(secret);
    expect(service.verifyWebhookSignature(body, "bad-signature")).toBe(false);
  });

  it("rejects when signature header is missing", () => {
    const service = serviceWithSecret(secret);
    expect(service.verifyWebhookSignature("{}", undefined)).toBe(false);
  });
});
