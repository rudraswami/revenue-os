import { Controller, Get, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { WhatsappAccountsService } from "../whatsapp-accounts/whatsapp-accounts.service";

@Controller("internal/cron")
export class InternalCronController {
  constructor(private readonly whatsappAccounts: WhatsappAccountsService) {}

  /** Vercel Cron: remind workspace owners to refresh expiring Meta API tokens. */
  @Get("whatsapp-token-reminders")
  @UseGuards(CronSecretGuard)
  runWhatsappTokenReminders() {
    return this.whatsappAccounts.runTokenReminderJob();
  }
}
