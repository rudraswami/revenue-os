import { Controller, Get, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { AutomationsService } from "../automations/automations.service";
import { WhatsappAccountsService } from "../whatsapp-accounts/whatsapp-accounts.service";

@Controller("internal/cron")
export class InternalCronController {
  constructor(
    private readonly whatsappAccounts: WhatsappAccountsService,
    private readonly automations: AutomationsService,
  ) {}

  /** Vercel Cron: remind workspace owners to refresh expiring Meta API tokens. */
  @Get("whatsapp-token-reminders")
  @UseGuards(CronSecretGuard)
  runWhatsappTokenReminders() {
    return this.whatsappAccounts.runTokenReminderJob();
  }

  /** Vercel Cron: email owners when conversations need follow-up after 24h. */
  @Get("followup-reminders")
  @UseGuards(CronSecretGuard)
  runFollowupReminders() {
    return this.automations.runFollowupReminderJob();
  }
}
