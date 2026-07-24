"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Megaphone, Trash2 } from "lucide-react";
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
import { TemplateStatusBadge, isTemplateSendable } from "./template-status-badge";
import { TEMPLATES } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";

function displayTemplateName(name: string): string {
  return name.replace(/_/g, " ");
}

export function TemplateRow({
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
  const hasMenu = editable || sendable || deletable;

  return (
    <li
      className={cn(
        "group flex flex-col gap-3 border-b border-border/60 px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">
            {displayTemplateName(template.name)}
          </p>
          <TemplateStatusBadge status={template.status} />
          {template.language && (
            <span className="text-xs text-muted-foreground">{template.language}</span>
          )}
        </div>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {template.bodyPreview || template.bodyText}
        </p>
        {template.rejectedReason && (
          <p className="mt-2 text-xs text-destructive">
            {TEMPLATES.rejectedReason(template.rejectedReason)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {sendable && (
          <Button asChild size="sm" variant="outline" className="rounded-xl">
            <Link
              href={`/dashboard/campaigns?template=${encodeURIComponent(template.name)}&lang=${encodeURIComponent(template.language)}&create=1`}
            >
              <Megaphone className="mr-1.5 h-3.5 w-3.5" />
              {TEMPLATES.useInCampaign}
            </Link>
          </Button>
        )}
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-8 rounded-xl p-0"
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
    </li>
  );
}
