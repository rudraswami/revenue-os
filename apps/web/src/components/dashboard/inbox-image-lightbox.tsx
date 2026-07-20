"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function InboxImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal
      aria-label="Image preview"
      onClick={onClose}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 h-10 w-10 text-white hover:bg-white/10"
        onClick={onClose}
        aria-label="Close preview"
      >
        <X className="h-5 w-5" />
      </Button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
