"use client";

import { ChevronLeft, ChevronRight, Download, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";

export function InboxImageLightbox({
  src,
  alt,
  onClose,
  onDownload,
  onPrev,
  onNext,
  className,
}: {
  src: string;
  alt: string;
  onClose: () => void;
  onDownload?: () => void | Promise<void>;
  onPrev?: () => void;
  onNext?: () => void;
  className?: string;
}) {
  const copy = useConversationsCopy();
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowRight" && onNext) {
        e.preventDefault();
        onNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  async function handleDownload() {
    if (!onDownload || downloading) return;
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4",
        className,
      )}
      role="dialog"
      aria-modal
      aria-label="Image preview"
      onClick={onClose}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2">
        {onDownload && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 gap-1.5 text-white hover:bg-white/10"
            disabled={downloading}
            onClick={(e) => {
              e.stopPropagation();
              void handleDownload();
            }}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {copy.downloadAttachment}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-white hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close preview"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {onPrev && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 h-11 w-11 -translate-y-1/2 text-white hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}

      {onNext && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 h-11 w-11 -translate-y-1/2 text-white hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}

      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
