"use client";

import { CheckCircle2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoveredPhone } from "@/lib/whatsapp-onboarding";

export function WhatsappPhonePicker({
  phones,
  selectedId,
  onSelect,
}: {
  phones: DiscoveredPhone[];
  selectedId: string;
  onSelect: (phone: DiscoveredPhone) => void;
}) {
  if (phones.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">
        {phones.length === 1 ? "Your business number" : "Select your business number"}
      </p>
      <ul className="space-y-2">
        {phones.map((phone) => {
          const selected = phone.phoneNumberId === selectedId;
          return (
            <li key={phone.phoneNumberId}>
              <button
                type="button"
                onClick={() => onSelect(phone)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  selected
                    ? "border-primary bg-primary-soft/60 ring-1 ring-primary/25"
                    : "border-border/80 hover:border-primary/30 hover:bg-muted/40",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    selected ? "bg-[#25D366]/20 text-whatsapp" : "bg-muted text-muted-foreground",
                  )}
                >
                  {selected ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">
                    {phone.verifiedName ?? phone.businessName ?? "Business line"}
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">{phone.displayPhoneNumber}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
