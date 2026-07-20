"use client";

import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { downloadInboxMessageMedia } from "@/lib/inbox-media-download";
import { inferInboxMediaFilename } from "@/lib/inbox-message-helpers";
import { cn } from "@/lib/utils";

export function InboxDocumentCard({
  conversationId,
  messageId,
  content,
  className,
}: {
  conversationId: string;
  messageId: string;
  content: string | null;
  className?: string;
}) {
  const copy = useConversationsCopy();
  const [downloading, setDownloading] = useState(false);
  const filename = inferInboxMediaFilename(content, "DOCUMENT", messageId);
  const label =
    content?.match(/^Document:\s*(.+)$/i)?.[1]?.trim() ?? copy.documentLabel;

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadInboxMessageMedia(conversationId, messageId, filename);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-3",
        className,
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">PDF</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 shrink-0 gap-1.5 rounded-lg text-xs"
        disabled={downloading}
        onClick={() => void handleDownload()}
      >
        {downloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {copy.downloadAttachment}
      </Button>
    </div>
  );
}
