"use client";

import { useEffect, useState } from "react";
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

export function AgencyClientRenameDialog({
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
  onConfirm: (displayName: string) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(clientName);

  useEffect(() => {
    if (open) setName(clientName);
  }, [open, clientName]);

  const trimmed = name.trim();
  const unchanged = trimmed === clientName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" showClose={false}>
        <DialogHeader>
          <DialogTitle>{t("agency.renameDialogTitle")}</DialogTitle>
          <DialogDescription>{t("agency.renameDialogDescription")}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="h-10 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed && !unchanged && !loading) {
                onConfirm(trimmed);
              }
            }}
          />
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!trimmed || unchanged || loading}
            onClick={() => onConfirm(trimmed)}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
