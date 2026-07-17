/** Homepage “How it works” — The Layer choreography (ms) */
export const LAYER_FILM_MS = {
  message: 0,
  sync: 700,
  understand: 1200,
  assign: 2000,
  pipeline: 3000,
  hold: 4800,
  loop: 8200,
} as const;

export const LAYER_FILM_COPY = {
  customer: {
    name: "Ananya Sharma",
    context: "Pune clinic · WhatsApp",
    message: "We need 40 units — can you confirm bulk pricing?",
  },
  classify: "Quote request · understood",
  assign: { name: "Meera", label: "Your turn" },
  deal: {
    title: "Ananya Sharma",
    subtitle: "Pune clinic order",
    stage: "Negotiation",
    value: "₹2,40,000",
    score: 86,
  },
} as const;
