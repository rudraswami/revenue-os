/** Common WhatsApp business emojis — compact set for fast picker. */
export const INBOX_EMOJI_GROUPS: Array<{ label: string; emojis: string[] }> = [
  {
    label: "Smileys",
    emojis: ["😊", "😀", "🙏", "👍", "👋", "❤️", "😅", "🎉", "✨", "🔥"],
  },
  {
    label: "Business",
    emojis: ["✅", "📞", "📍", "⏰", "💰", "💳", "📦", "🛍️", "📎", "💬"],
  },
];

export const INBOX_EMOJI_FLAT = INBOX_EMOJI_GROUPS.flatMap((g) => g.emojis);
