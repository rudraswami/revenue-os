/** Max BullMQ enqueue wait during webhook HTTP handler — keeps ACK under 300ms p95 budget. */
export const WEBHOOK_ACK_ENQUEUE_TIMEOUT_MS = 200;
