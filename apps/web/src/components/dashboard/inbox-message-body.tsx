"use client";

import { FileText, ImageIcon, Loader2, Mic, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface MessageMediaProps {
  conversationId: string;
  messageId: string;
  type: string;
  content: string | null;
  className?: string;
}

function apiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000")
    .replace(/[\r\n]+/g, "")
    .trim()
    .replace(/\/$/, "");
  return raw.endsWith("/api/v1") ? raw : `${raw}/api/v1`;
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
        const res = await fetch(
          `${apiBase()}/conversations/${conversationId}/messages/${messageId}/media`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
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
  const isVisual = type === "IMAGE" || type === "VIDEO" || type === "STICKER";
  const isAudio = type === "AUDIO";
  const mediaUrl = useAuthenticatedMediaUrl(
    conversationId,
    messageId,
    isVisual || isAudio,
  );

  if ((isVisual || isAudio) && !mediaUrl) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{content ?? "Loading attachment…"}</span>
      </div>
    );
  }

  if (isVisual && mediaUrl) {
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
