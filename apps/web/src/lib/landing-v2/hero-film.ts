export const LANDING_V2_HERO_SIGNATURE = "handoff" as const;

/** Choreography beats (ms) — single source of truth */
export const HERO_HANDOFF_MS = {
  message: 0,
  scan: 550,
  understand: 1050,
  stop: 1850,
  yourTurn: 2650,
  reply: 5200,
  hold: 7000,
  loop: 10800,
} as const;

export const HERO_HANDOFF_COPY = {
  customer: {
    name: "Ananya Sharma",
    context: "WhatsApp · Pune clinic",
    message:
      "We need 40 units for our Pune clinic. Can you confirm bulk pricing?",
  },
  ghostReply:
    "Thanks for reaching out! Here's our standard price list for retail orders…",
  human: {
    name: "Meera",
    reply:
      "Sending the clinic pack now — we can lock delivery for Tuesday.",
  },
} as const;
