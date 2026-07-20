"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

/**
 * Toasts live in an external store rather than provider state. Firing a toast
 * must never rerender the entire app tree — only the <ToastViewport> subscriber
 * updates. The context value is a stable module constant.
 */
const EMPTY: ToastItem[] = [];
let toastItems: ToastItem[] = EMPTY;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return toastItems;
}

function getServerSnapshot() {
  return EMPTY;
}

function dismissToast(id: string) {
  const next = toastItems.filter((t) => t.id !== id);
  if (next.length !== toastItems.length) {
    toastItems = next;
    emit();
  }
}

function pushToast(message: string, variant: ToastVariant = "success") {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toastItems = [...toastItems.slice(-4), { id, message, variant }];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => dismissToast(id), 4500);
  }
}

const TOAST_API: ToastContextValue = {
  toast: (message, variant = "success") => pushToast(message, variant),
  success: (message) => pushToast(message, "success"),
  error: (message) => pushToast(message, "error"),
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

/** Safe hook — returns the stable API even outside a provider (e.g. tests). */
export function useToastOptional(): ToastContextValue {
  return useContext(ToastContext) ?? TOAST_API;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <ToastContext.Provider value={TOAST_API}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

function ToastViewport() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-20 left-4 z-[100] flex max-w-sm flex-col gap-2 md:bottom-6 md:left-auto md:right-4"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={cn(
            "pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm elev-2 gv-animate-toast",
            item.variant === "success" && "border-accent/20 bg-card text-foreground",
            item.variant === "error" && "border-destructive/30 bg-card text-destructive",
            item.variant === "info" && "border-border bg-muted/40 text-foreground",
          )}
        >
          {item.variant === "error" ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : item.variant === "info" ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          )}
          <p className="min-w-0 flex-1 leading-snug">{item.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(item.id)}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
