/** Emoji dataset for the inbox composer picker: searchable + grouped. */
export interface InboxEmoji {
  char: string;
  keywords: string[];
}

export interface InboxEmojiCategory {
  label: string;
  items: InboxEmoji[];
}

export const INBOX_EMOJI_CATEGORIES: InboxEmojiCategory[] = [
  {
    label: "Smileys",
    items: [
      { char: "😊", keywords: ["smile", "happy", "blush"] },
      { char: "😀", keywords: ["grin", "happy", "smile"] },
      { char: "😃", keywords: ["smile", "happy"] },
      { char: "😄", keywords: ["laugh", "happy"] },
      { char: "😁", keywords: ["grin", "beam"] },
      { char: "😅", keywords: ["sweat", "relief", "phew"] },
      { char: "😂", keywords: ["laugh", "lol", "tears", "joy"] },
      { char: "🙂", keywords: ["smile", "slight"] },
      { char: "😉", keywords: ["wink"] },
      { char: "😍", keywords: ["love", "heart", "eyes"] },
      { char: "😘", keywords: ["kiss", "love"] },
      { char: "🤔", keywords: ["think", "hmm"] },
      { char: "😎", keywords: ["cool", "sunglasses"] },
      { char: "🙃", keywords: ["upside", "silly"] },
      { char: "😢", keywords: ["sad", "cry", "tear"] },
      { char: "😭", keywords: ["cry", "sob", "sad"] },
      { char: "😅", keywords: ["nervous", "sweat"] },
      { char: "🥳", keywords: ["party", "celebrate"] },
      { char: "😇", keywords: ["angel", "innocent"] },
      { char: "🤗", keywords: ["hug", "thanks"] },
    ],
  },
  {
    label: "Gestures",
    items: [
      { char: "👍", keywords: ["thumbs", "up", "ok", "yes", "good"] },
      { char: "👎", keywords: ["thumbs", "down", "no", "bad"] },
      { char: "🙏", keywords: ["thanks", "please", "pray", "namaste"] },
      { char: "👋", keywords: ["wave", "hi", "hello", "bye"] },
      { char: "👏", keywords: ["clap", "well done", "bravo"] },
      { char: "🙌", keywords: ["celebrate", "hooray", "hands"] },
      { char: "🤝", keywords: ["handshake", "deal", "agree"] },
      { char: "👌", keywords: ["ok", "perfect", "good"] },
      { char: "✌️", keywords: ["peace", "victory"] },
      { char: "🤞", keywords: ["fingers", "crossed", "luck"] },
      { char: "💪", keywords: ["strong", "muscle", "power"] },
      { char: "👇", keywords: ["down", "point"] },
    ],
  },
  {
    label: "Hearts",
    items: [
      { char: "❤️", keywords: ["heart", "love", "red"] },
      { char: "🧡", keywords: ["heart", "orange"] },
      { char: "💛", keywords: ["heart", "yellow"] },
      { char: "💚", keywords: ["heart", "green"] },
      { char: "💙", keywords: ["heart", "blue"] },
      { char: "💜", keywords: ["heart", "purple"] },
      { char: "🖤", keywords: ["heart", "black"] },
      { char: "💯", keywords: ["hundred", "perfect", "score"] },
    ],
  },
  {
    label: "Business",
    items: [
      { char: "✅", keywords: ["check", "done", "yes", "confirm"] },
      { char: "❌", keywords: ["cross", "no", "cancel", "wrong"] },
      { char: "⏰", keywords: ["time", "clock", "reminder", "alarm"] },
      { char: "📅", keywords: ["calendar", "date", "schedule"] },
      { char: "📞", keywords: ["call", "phone"] },
      { char: "📱", keywords: ["mobile", "phone", "whatsapp"] },
      { char: "📍", keywords: ["location", "pin", "address"] },
      { char: "💰", keywords: ["money", "price", "cash", "payment"] },
      { char: "💳", keywords: ["card", "payment", "pay"] },
      { char: "🧾", keywords: ["invoice", "receipt", "bill"] },
      { char: "📦", keywords: ["package", "order", "delivery", "box"] },
      { char: "🛍️", keywords: ["shopping", "bag", "buy"] },
      { char: "🚚", keywords: ["delivery", "shipping", "truck"] },
      { char: "📎", keywords: ["attach", "clip", "file"] },
      { char: "📄", keywords: ["document", "file", "page"] },
      { char: "💬", keywords: ["message", "chat", "reply"] },
      { char: "📢", keywords: ["announce", "offer", "promo"] },
      { char: "🎯", keywords: ["target", "goal", "offer"] },
    ],
  },
  {
    label: "Symbols",
    items: [
      { char: "🔥", keywords: ["fire", "hot", "trending"] },
      { char: "✨", keywords: ["sparkle", "new", "shine"] },
      { char: "🎉", keywords: ["party", "celebrate", "congrats"] },
      { char: "⭐", keywords: ["star", "rating", "favorite"] },
      { char: "❗", keywords: ["important", "exclamation"] },
      { char: "❓", keywords: ["question", "help"] },
      { char: "⚠️", keywords: ["warning", "caution"] },
      { char: "🎁", keywords: ["gift", "offer", "present"] },
    ],
  },
];

export const INBOX_EMOJI_FLAT: InboxEmoji[] = INBOX_EMOJI_CATEGORIES.flatMap(
  (c) => c.items,
);

/** Case-insensitive keyword/char search across the whole set (deduped). */
export function searchInboxEmojis(query: string): InboxEmoji[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const out: InboxEmoji[] = [];
  for (const item of INBOX_EMOJI_FLAT) {
    if (seen.has(item.char)) continue;
    if (item.char === q || item.keywords.some((k) => k.includes(q))) {
      seen.add(item.char);
      out.push(item);
    }
  }
  return out;
}

const RECENTS_KEY = "growvisi-emoji-recents";
const RECENTS_MAX = 16;

export function loadRecentEmojis(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, RECENTS_MAX)
      : [];
  } catch {
    return [];
  }
}

export function pushRecentEmoji(char: string): string[] {
  if (typeof window === "undefined") return [];
  const next = [char, ...loadRecentEmojis().filter((c) => c !== char)].slice(
    0,
    RECENTS_MAX,
  );
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // storage blocked — recents are best-effort only
  }
  return next;
}
