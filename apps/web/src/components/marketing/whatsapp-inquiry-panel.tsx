"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, QrCode, Smartphone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_PAGE, WHATSAPP_INQUIRY } from "@/lib/brand-copy";
import { recordWhatsAppInquiry } from "@/lib/marketing-inquiry";
import {
  buildInquiryWhatsAppMessage,
  getSalesWhatsAppDigits,
  getSalesWhatsAppUrl,
  type InquiryKind,
} from "@/lib/marketing-support";
import { cn } from "@/lib/utils";
import { WhatsAppQrCode } from "./whatsapp-qr-code";

const TEAM_OPTIONS: Record<InquiryKind, { value: string; label: string }[]> = {
  sales: [
    { value: "", label: "Select…" },
    { value: "1-5", label: "1–5 people" },
    { value: "6-20", label: "6–20 people" },
    { value: "21-50", label: "21–50 people" },
  ],
  enterprise: [
    { value: "", label: "Select…" },
    { value: "15+ clients", label: "15+ agency clients" },
    { value: "franchise", label: "Franchise / multi-location" },
    { value: "100k+ leads", label: "100k+ leads / month" },
    { value: "custom", label: "Custom SLA / compliance" },
  ],
};

const STEP_ICONS = [UserRound, QrCode, Smartphone];

export function WhatsAppInquiryPanel({
  id = "inquiry",
  className,
}: {
  id?: string;
  className?: string;
}) {
  const [kind, setKind] = useState<InquiryKind>("sales");
  const copy = WHATSAPP_INQUIRY.types[kind];
  const teamOptions = TEAM_OPTIONS[kind];
  const salesDigits = getSalesWhatsAppDigits();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "enterprise" || hash === "inquiry-enterprise") {
      setKind("enterprise");
    }
    if (hash === "whatsapp" || hash === "enterprise" || hash === "inquiry") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [id]);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [team, setTeam] = useState("");
  const [message, setMessage] = useState("");

  const canOpen =
    name.trim().length >= 2 && company.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10;

  const waMessage = useMemo(() => {
    if (!canOpen) return "";
    return buildInquiryWhatsAppMessage({
      kind,
      name,
      company,
      phone,
      team: team || undefined,
      message: message || undefined,
    });
  }, [canOpen, kind, name, company, phone, team, message]);

  const activeWaUrl = canOpen && waMessage ? getSalesWhatsAppUrl(waMessage) : getSalesWhatsAppUrl();

  const onOpenWhatsApp = () => {
    if (!canOpen || !activeWaUrl) return;
    recordWhatsAppInquiry(
      typeof window !== "undefined" ? `${window.location.pathname}${window.location.hash}` : "/contact",
      undefined,
      waMessage,
      kind,
    );
    window.open(activeWaUrl, "_blank", "noopener,noreferrer");
  };

  const onKindChange = (next: InquiryKind) => {
    setKind(next);
    setTeam("");
  };

  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <div className="wa-inquiry-shell overflow-hidden rounded-3xl border border-border bg-white shadow-[0_20px_56px_rgb(11_28_48/0.07)]">
        <div className="border-b border-border bg-gradient-to-br from-[#f0fdf4] to-[#f6fdf9] px-6 py-5 md:px-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/15">
              <MessageCircle className="h-5 w-5 text-[#128C7E]" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-accent">WhatsApp</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">
                {CONTACT_PAGE.inquirySectionTitle}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {CONTACT_PAGE.inquirySectionSubtitle}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="sr-only">{WHATSAPP_INQUIRY.typeLabel}</span>
            {(Object.keys(WHATSAPP_INQUIRY.types) as InquiryKind[]).map((key) => {
              const typeCopy = WHATSAPP_INQUIRY.types[key];
              const active = kind === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onKindChange(key)}
                  className={cn(
                    "rounded-full px-4 py-2 text-[12px] font-semibold transition",
                    active
                      ? "bg-accent text-white shadow-sm"
                      : "bg-white/80 text-muted-foreground ring-1 ring-border hover:text-foreground",
                  )}
                  aria-pressed={active}
                >
                  {typeCopy.label}
                </button>
              );
            })}
          </div>

          <ol className="mt-6 flex flex-wrap gap-3">
            {WHATSAPP_INQUIRY.steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? MessageCircle;
              const done = i === 0 ? canOpen : i === 1 ? canOpen : false;
              return (
                <li
                  key={step}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                    done ? "bg-accent/15 text-accent" : "bg-white/70 text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {i + 1}. {step}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <div className="space-y-4 border-b border-border p-6 md:p-8 lg:border-b-0 lg:border-r">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">{WHATSAPP_INQUIRY.fields.name}</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Meera Shah"
                  className="h-11 rounded-xl"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">{WHATSAPP_INQUIRY.fields.company}</span>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Pune Clinic Pvt Ltd"
                  className="h-11 rounded-xl"
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{WHATSAPP_INQUIRY.fields.phone}</span>
              <div className="flex gap-2">
                <span className="flex h-11 shrink-0 items-center rounded-xl border border-border bg-[#fafbff] px-3 text-sm font-semibold text-muted-foreground">
                  +91
                </span>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  inputMode="numeric"
                  className="h-11 rounded-xl"
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                {WHATSAPP_INQUIRY.fields.phoneHint}
              </span>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{copy.teamLabel}</span>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                {teamOptions.map((o) => (
                  <option key={o.value || "empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Message</span>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={copy.messagePlaceholder}
                rows={3}
                className="rounded-xl"
              />
            </label>

            <div className="wa-inquiry-preview rounded-xl border border-border bg-[#fafbff] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {WHATSAPP_INQUIRY.previewLabel}
              </p>
              <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-foreground">
                {canOpen ? waMessage : WHATSAPP_INQUIRY.previewEmpty}
              </pre>
            </div>
          </div>

          <div className="wa-inquiry-qr-col flex flex-col items-center bg-gradient-to-b from-[#f0fdf4]/80 to-white p-6 md:p-8">
            {activeWaUrl && salesDigits ? (
              <>
                <WhatsAppQrCode url={activeWaUrl} active={canOpen} />
                <p className="mt-4 text-center text-[12px] font-medium text-[#075e54]">
                  {WHATSAPP_INQUIRY.qrCaption}
                </p>
                <p className="mt-1 text-center text-[11px] text-muted-foreground">
                  {WHATSAPP_INQUIRY.humanReply}
                </p>

                <Button
                  type="button"
                  size="lg"
                  className="mt-5 w-full bg-[#25D366] text-[15px] font-semibold hover:bg-[#1ebe57]"
                  disabled={!canOpen}
                  onClick={onOpenWhatsApp}
                >
                  <MessageCircle className="h-4 w-4" />
                  {copy.cta}
                </Button>
              </>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {WHATSAPP_INQUIRY.configureHint}{" "}
                <Link href="mailto:support@growvisi.in" className="font-semibold text-accent">
                  support@growvisi.in
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
