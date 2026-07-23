"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/locale-provider";
import { formatMessage } from "@/lib/i18n/format-message";

export function AgencyClientInviteDialog({
  clientName,
  open,
  loading,
  onOpenChange,
  onConfirm,
}: {
  clientName: string;
  open: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (email: string) => void;
}) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");

  const trimmed = email.trim().toLowerCase();
  const valid = trimmed.includes("@") && trimmed.length > 3;

  function handleOpenChange(next: boolean) {
    if (!next) setEmail("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm" showClose={false}>
        <DialogHeader>
          <DialogTitle>{t("agency.inviteOwner")}</DialogTitle>
          <DialogDescription>
            {formatMessage(t("agency.inviteDialogDescription"), { name: clientName })}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("agency.inviteEmailPlaceholder")}
            className="h-10 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid && !loading) onConfirm(trimmed);
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">{t("agency.inviteOwnerHint")}</p>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => handleOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!valid || loading}
            onClick={() => onConfirm(trimmed)}
          >
            {t("agency.inviteSendBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
