import type { Socket } from "socket.io-client";

type TypingPayload = { conversationId: string; userName: string };
type TypingHandler = (payload: TypingPayload) => void;

let socket: Socket | null = null;
const typingHandlers = new Set<TypingHandler>();

export function bindRealtimeSocket(next: Socket | null) {
  if (socket && socket !== next) {
    socket.off("conversation.typing", dispatchTyping);
  }
  socket = next;
  if (socket) {
    socket.on("conversation.typing", dispatchTyping);
  }
}

function dispatchTyping(payload: TypingPayload) {
  for (const handler of typingHandlers) {
    handler(payload);
  }
}

export function emitConversationTyping(conversationId: string, userName?: string) {
  socket?.emit("conversation.typing", {
    conversationId,
    userName: userName?.trim() || "Teammate",
  });
}

export function onConversationTyping(handler: TypingHandler): () => void {
  typingHandlers.add(handler);
  return () => typingHandlers.delete(handler);
}
