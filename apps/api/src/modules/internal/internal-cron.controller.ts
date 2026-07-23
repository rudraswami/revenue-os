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
   * Vercel Cron (daily at 02:00 UTC — Hobby-compatible): last-resort safety
   * net that reprocesses orphaned webhook events and re-enqueues dropped AI
   * classify jobs. Primary reliability is in the webhook handler itself
   * (fully synchronous persist + inline classify); this catches edge cases.
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

  /** Vercel Cron: send due scheduled campaigns and recover stuck RUNNING sends. */
  @Get("scheduled-campaigns")
  @UseGuards(CronSecretGuard)
  async runScheduledCampaigns() {
    const [scheduled, recovery] = await Promise.all([
      this.campaigns.processDueScheduledCampaigns(),
      this.campaigns.recoverStuckRunningCampaigns(),
    ]);
    return { scheduled, recovery };
  }

  /** Weekly purge of processed webhook events and completed AI runs (90d TTL). */
  @Get("data-retention")
  @UseGuards(CronSecretGuard)
  runDataRetention() {
    return this.retention.purgeOldOperationalData();
  }
}
