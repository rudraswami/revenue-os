/** Tracks the inbox thread open in the current tab for narrow realtime cache patches. */
let activeConversationId: string | null = null;

export function setActiveInboxConversationId(id: string | null): void {
  activeConversationId = id;
}

export function getActiveInboxConversationId(): string | null {
  return activeConversationId;
}
