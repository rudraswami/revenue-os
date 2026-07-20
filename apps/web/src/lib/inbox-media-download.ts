import { apiDownload } from "@/lib/api-client";

export async function downloadInboxMessageMedia(
  conversationId: string,
  messageId: string,
  filename: string,
): Promise<void> {
  await apiDownload(
    `/conversations/${conversationId}/messages/${messageId}/media`,
    filename,
  );
}
