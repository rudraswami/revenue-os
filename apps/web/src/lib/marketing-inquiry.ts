import { apiFetch } from "@/lib/api-client";

export function recordWhatsAppInquiry(
  page?: string,
  locale?: "en" | "hi",
  message?: string,
  inquiryKind?: "sales" | "enterprise",
) {
  void apiFetch("/public/marketing-help/inquiry", {
    method: "POST",
    skipAuthRetry: true,
    body: JSON.stringify({
      kind: "whatsapp_click",
      page: page ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
      locale,
      message: message?.slice(0, 2000),
      inquiryKind,
    }),
  }).catch(() => {
    /* non-blocking */
  });
}
