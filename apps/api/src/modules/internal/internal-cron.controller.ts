import { Controller, Get, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { AutomationsService } from "../automations/automations.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { DigestService } from "../digest/digest.service";
import { WhatsappAccountsService } from "../whatsapp-accounts/whatsapp-accounts.service";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { DataRetentionService } from "./data-retention.service";

@SkipThrottle()
@Controller("internal/cron")
export class InternalCronController {
  constructor(
    private readonly whatsappAccounts: WhatsappAccountsService,
    private readonly whatsapp: WhatsappService,
    private readonly automations: AutomationsService,
    private readonly digest: DigestService,
    private readonly campaigns: CampaignsService,
    private readonly retention: DataRetentionService,
  ) {}

  /**
   * Vercel Cron (every minute): server-side safety net that reprocesses any
   * inbound webhook or unclassified conversation left behind by a dropped
   * background task. Guarantees messaging + Auto Reply run without the web app
   * being open.
   */
  @Get("reconcile-inbound")
  @UseGuards(CronSecretGuard)
  runInboundReconcile() {
    return this.whatsapp.reconcilePendingWork();
  }

  /** Vercel Cron: remind workspace owners to refresh expiring Meta API tokens. */
  @Get("whatsapp-token-reminders")
  @UseGuards(CronSecretGuard)
  runWhatsappTokenReminders() {
    return this.whatsappAccounts.runTokenReminderJob();
  }

  /** Vercel Cron: exchange Meta tokens before they expire (fb_exchange_token). */
  @Get("whatsapp-token-refresh")
  @UseGuards(CronSecretGuard)
  runWhatsappTokenAutoRefresh() {
    return this.whatsappAccounts.runTokenAutoRefreshJob();
  }

  /** Vercel Cron: email owners when conversations need follow-up after 24h. */
  @Get("followup-reminders")
  @UseGuards(CronSecretGuard)
  runFollowupReminders() {
    return this.automations.runFollowupReminderJob();
  }

  /** Vercel Cron: morning revenue digest email to owners/admins (IST). */
  @Get("daily-digest")
  @UseGuards(CronSecretGuard)
  runDailyDigest() {
    return this.digest.runDailyDigestJob();
  }

  /** Vercel Cron: send WhatsApp campaigns scheduled for now or earlier. */
  @Get("scheduled-campaigns")
  @UseGuards(CronSecretGuard)
  runScheduledCampaigns() {
    return this.campaigns.processDueScheduledCampaigns();
  }

  /** Weekly purge of processed webhook events and completed AI runs (90d TTL). */
  @Get("data-retention")
  @UseGuards(CronSecretGuard)
  runDataRetention() {
    return this.retention.purgeOldOperationalData();
  }
}
