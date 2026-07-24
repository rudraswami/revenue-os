"use client";

import Link from "next/link";
import { ChevronRight, Megaphone, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { MessageTemplateView } from "@growvisi/shared";
import {
  canDeleteTemplate,
  canEditTemplateBody,
  templateEditActionLabel,
} from "@growvisi/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { humanizeTemplateRejectionReason } from "@growvisi/shared";
import { TemplateStatusBadge, isTemplateSendable } from "./template-status-badge";
import {
  displayTemplateLanguage,
  displayTemplateName,
  formatTemplateRejectionReason,
} from "./template-utils";
import { renderTemplateBody } from "@/components/dashboard/template-preview-bubble";
import { TEMPLATES } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  className,
}: {
  template: MessageTemplateView;
  onEdit: (t: MessageTemplateView) => void;
  onDelete: (t: MessageTemplateView) => void;
  className?: string;
}) {
  const sendable = isTemplateSendable(template.status);
  const editable = canEditTemplateBody(template.status);
  const deletable = canDeleteTemplate(template.status);
  const rejection = formatTemplateRejectionReason(template.rejectedReason);
  const showRejection = template.status === "REJECTED" && rejection;
  const preview = renderTemplateBody(template.bodyPreview || template.bodyText);

  return (
    <article
      className={cn(
        "group flex flex-col rounded-2xl border border-border/80 bg-card p-4 transition hover:border-accent/25 hover:shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {displayTemplateName(template.name)}
            </h3>
            <TemplateStatusBadge status={template.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {displayTemplateLanguage(template.language)}
          </p>
        </div>
        {(editable || deletable) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 rounded-lg p-0 text-muted-foreground"
                aria-label="Template actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {editable && (
                <DropdownMenuItem onClick={() => onEdit(template)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  {templateEditActionLabel(template.status)}
                </DropdownMenuItem>
              )}
              {deletable && (
                <>
                  {editable && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(template)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    {TEMPLATES.deleteTemplate}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mt-3 rounded-xl rounded-tl-sm bg-bento-mint/40 px-3 py-2.5 text-sm leading-relaxed text-foreground">
        <p className="line-clamp-3">{preview}</p>
      </div>

      {showRejection && (
        <p className="mt-2 text-xs leading-relaxed text-destructive">
          {humanizeTemplateRejectionReason(rejection)}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        {sendable ? (
          <Button asChild size="sm" className="flex-1 rounded-xl">
            <Link
              href={`/dashboard/campaigns?template=${encodeURIComponent(template.name)}&lang=${encodeURIComponent(template.language)}&create=1`}
            >
              <Megaphone className="mr-1.5 h-3.5 w-3.5" />
              {TEMPLATES.useInCampaign}
            </Link>
          </Button>
        ) : editable ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => onEdit(template)}
          >
            {templateEditActionLabel(template.status)}
            <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">{TEMPLATES.awaitingReview}</p>
        )}
      </div>
    </article>
  );
}
