/** Parse conversation id from inbox URL search params (`c` canonical, `conversation` legacy). */
export function inboxConversationIdFromParams(params: URLSearchParams): string | null {
  return params.get("c") || params.get("conversation");
}
