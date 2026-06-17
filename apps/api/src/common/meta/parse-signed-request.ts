import { createHmac, timingSafeEqual } from "crypto";

export interface MetaSignedRequestPayload {
  user_id: string;
  algorithm: string;
  issued_at: number;
  expires?: number;
}

/** Parse Meta `signed_request` (Facebook Login data deletion callback). */
export function parseMetaSignedRequest(
  signedRequest: string,
  appSecret: string,
): MetaSignedRequestPayload {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) {
    throw new Error("Invalid signed_request format");
  }

  const [encodedSig, payload] = parts;
  const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const expected = createHmac("sha256", appSecret).update(payload).digest();

  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    throw new Error("Invalid signed_request signature");
  }

  const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  return JSON.parse(json) as MetaSignedRequestPayload;
}
