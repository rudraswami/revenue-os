"use client";

import { FileText, ImageIcon, Loader2, Mic, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { apiObjectUrl } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface MessageMediaProps {
  conversationId: string;
  messageId: string;
  type: string;
  content: string | null;
  className?: string;
}

function mediaIcon(type: string) {
  switch (type) {
    case "IMAGE":
    case "STICKER":
      return ImageIcon;
    case "AUDIO":
      return Mic;
    case "VIDEO":
      return Video;
    default:
      return FileText;
  }
}

function useAuthenticatedMediaUrl(
  conversationId: string,
  messageId: string,
  enabled: boolean,
): string | null {
  const token = useAuthStore((s) => s.accessToken);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !token) {
      setUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const created = await apiObjectUrl(
          `/conversations/${conversationId}/messages/${messageId}/media`,
        );
        if (cancelled) {
          URL.revokeObjectURL(created);
          return;
        }
        objectUrl = created;
        setUrl(created);
      } catch {
        if (!cancelled) setUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [conversationId, messageId, enabled, token]);

  return url;
}

export function InboxMessageBody({
  conversationId,
  messageId,
  type,
  content,
  className,
}: MessageMediaProps) {
  const Icon = mediaIcon(type);
  const isImage = type === "IMAGE" || type === "STICKER";
  const isVideo = type === "VIDEO";
  const isAudio = type === "AUDIO";
  const needsMedia = isImage || isVideo || isAudio;
  const mediaUrl = useAuthenticatedMediaUrl(
    conversationId,
    messageId,
    needsMedia,
  );

  if (needsMedia && !mediaUrl) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{content ?? "Loading attachment…"}</span>
      </div>
    );
  }

  if (isImage && mediaUrl) {
    return (
      <div className={cn("space-y-2", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl}
          alt={content ?? "WhatsApp attachment"}
          className="max-h-64 rounded-lg object-cover"
          loading="lazy"
        />
        {content && !content.startsWith("[") && (
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        )}
      </div>
    );
  }

  if (isVideo && mediaUrl) {
    return (
      <div className={cn("space-y-2", className)}>
        <video
          controls
          className="max-h-64 rounded-lg"
          preload="metadata"
        >
          <source src={mediaUrl} />
        </video>
        {content && !content.startsWith("[") && (
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        )}
      </div>
    );
  }

  if (isAudio && mediaUrl) {
    return (
      <div className={cn("space-y-2", className)}>
        <audio controls className="max-w-full" preload="none">
          <source src={mediaUrl} />
        </audio>
        {content && <p className="text-xs text-muted-foreground">{content}</p>}
      </div>
    );
  }

  return (
    <p className={cn("whitespace-pre-wrap", className)}>
      {content?.startsWith("[") ? (
        <span className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
          {content}
        </span>
      ) : (
        (content ?? "—")
      )}
    </p>
  );
}
