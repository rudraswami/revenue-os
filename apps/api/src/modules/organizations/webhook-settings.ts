export type WebhookEventType = "lead.stage.changed" | "lead.created";

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  enabled: boolean;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: WebhookEventType;
  statusCode: number | null;
  success: boolean;
  error?: string;
  deliveredAt: string;
}

export interface WebhooksConfig {
  endpoints: WebhookEndpoint[];
  deliveries: WebhookDelivery[];
}

const MAX_ENDPOINTS = 3;
const MAX_DELIVERIES = 50;

export const WEBHOOK_EVENT_LABELS: Record<WebhookEventType, string> = {
  "lead.stage.changed": "Lead stage changed",
  "lead.created": "New lead created",
};

export function normalizeWebhooksConfig(raw: unknown): WebhooksConfig {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<WebhooksConfig>;
  const endpoints = Array.isArray(input.endpoints)
    ? input.endpoints
        .filter((e) => e && typeof e === "object")
        .slice(0, MAX_ENDPOINTS)
        .map((e) => {
          const ep = e as Partial<WebhookEndpoint>;
          return {
            id: String(ep.id ?? `wh_${Math.random().toString(36).slice(2, 10)}`),
            name: String(ep.name ?? "Webhook").slice(0, 80),
            url: String(ep.url ?? "").slice(0, 500),
            secret: String(ep.secret ?? "").slice(0, 128),
            events: Array.isArray(ep.events)
              ? ep.events.filter((ev): ev is WebhookEventType =>
                  ev === "lead.stage.changed" || ev === "lead.created",
                )
              : (["lead.stage.changed"] as WebhookEventType[]),
            enabled: ep.enabled !== false,
            createdAt: typeof ep.createdAt === "string" ? ep.createdAt : new Date().toISOString(),
          };
        })
    : [];

  const deliveries = Array.isArray(input.deliveries)
    ? input.deliveries
        .filter((d) => d && typeof d === "object")
        .slice(0, MAX_DELIVERIES)
        .map((d) => {
          const row = d as Partial<WebhookDelivery>;
          return {
            id: String(row.id ?? `del_${Math.random().toString(36).slice(2, 10)}`),
            endpointId: String(row.endpointId ?? ""),
            event: (row.event === "lead.created" ? "lead.created" : "lead.stage.changed") as WebhookEventType,
            statusCode: typeof row.statusCode === "number" ? row.statusCode : null,
            success: row.success === true,
            error: row.error ? String(row.error).slice(0, 200) : undefined,
            deliveredAt:
              typeof row.deliveredAt === "string" ? row.deliveredAt : new Date().toISOString(),
          };
        })
    : [];

  return { endpoints, deliveries };
}

export function appendDelivery(
  config: WebhooksConfig,
  delivery: Omit<WebhookDelivery, "id" | "deliveredAt">,
): WebhooksConfig {
  const row: WebhookDelivery = {
    ...delivery,
    id: `del_${Math.random().toString(36).slice(2, 10)}`,
    deliveredAt: new Date().toISOString(),
  };
  return {
    endpoints: config.endpoints,
    deliveries: [row, ...config.deliveries].slice(0, MAX_DELIVERIES),
  };
}

export { MAX_ENDPOINTS };
