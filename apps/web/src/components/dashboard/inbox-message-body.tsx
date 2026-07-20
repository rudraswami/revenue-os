"use client";

import { FileText, ImageIcon, Loader2, Mic, Video, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InboxImageLightbox } from "@/components/dashboard/inbox-image-lightbox";
import { getCachedInboxMediaUrl } from "@/lib/inbox-media-cache";
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

function useInView(rootMargin = "120px") {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}

function useAuthenticatedMediaUrl(
  conversationId: string,
  messageId: string,
  enabled: boolean,
): { url: string | null; loading: boolean } {
  const token = useAuthStore((s) => s.accessToken);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !token) {
      setUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const cached = await getCachedInboxMediaUrl(conversationId, messageId);
        if (!cancelled) {
          setUrl(cached);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setUrl(null);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, messageId, enabled, token]);

  return { url, loading };
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
  const { ref, inView } = useInView();
  const { url: mediaUrl, loading: mediaLoading } = useAuthenticatedMediaUrl(
    conversationId,
    messageId,
    needsMedia && inView,
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (needsMedia && !inView) {
    return (
      <div ref={ref} className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Icon className="h-3.5 w-3.5" />
        <span>{content ?? "Attachment"}</span>
      </div>
    );
  }

  if (needsMedia && (mediaLoading || !mediaUrl)) {
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
        <button
          type="button"
          className="group relative block max-w-full overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => setLightboxOpen(true)}
          aria-label="Open image preview"
        >
          <img
            src={mediaUrl}
            alt={content ?? "WhatsApp attachment"}
            className="max-h-64 rounded-lg object-cover transition group-hover:opacity-95"
            loading="lazy"
          />
          <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
            <ZoomIn className="h-3.5 w-3.5" />
          </span>
        </button>
        {content && !content.startsWith("[") && (
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        )}
        {lightboxOpen && (
          <InboxImageLightbox
            src={mediaUrl}
            alt={content ?? "WhatsApp attachment"}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </div>
    );
  }

  if (isVideo && mediaUrl) {
    return (
      <div className={cn("space-y-2", className)}>
        <video controls className="max-h-64 rounded-lg" preload="metadata">
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
