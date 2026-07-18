import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GROWVISI_EMAIL_FROM, GROWVISI_EMAIL_SUPPORT } from "@growvisi/shared";
import { roleUiLabel, type MembershipRole } from "@growvisi/shared";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    await this.sendRaw({
      to: [email],
      subject: "Reset your Growvisi password",
      html: `
        <p>You requested a password reset for Growvisi.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      `,
    });
  }

  async sendEmailVerification(opts: {
    to: string;
    firstName: string;
    verifyUrl: string;
  }): Promise<void> {
    const name = opts.firstName.trim() || "there";
    await this.sendRaw({
      to: [opts.to],
      subject: "Verify your email for Growvisi",
      html: `
        <p>Hi ${name},</p>
        <p>Welcome to Growvisi. Verify your email to activate your workspace and connect WhatsApp.</p>
        <p style="margin:24px 0">
          <a href="${opts.verifyUrl}" style="display:inline-block;background:#006c49;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Verify email address</a>
        </p>
        <p style="font-size:13px;color:#555">This link expires in 24 hours.</p>
        <p style="font-size:13px;color:#888">If you didn't create a Growvisi account, you can ignore this email.</p>
        <p style="font-size:12px;color:#aaa;margin-top:24px">Growvisi · WhatsApp revenue for Indian SMBs<br/>growvisi.in</p>
      `,
      replyTo: GROWVISI_EMAIL_SUPPORT,
    });
  }

  async sendWhatsappTokenReminder(opts: {
    to: string[];
    organizationName: string;
    displayPhoneNumber: string;
    expiryText: string;
    settingsUrl: string;
  }): Promise<void> {
    await this.sendRaw({
      to: opts.to,
      subject: `Action needed: refresh WhatsApp token for ${opts.displayPhoneNumber}`,
      html: `
        <p>Hi,</p>
        <p>${opts.expiryText} for <strong>${opts.organizationName}</strong> (${opts.displayPhoneNumber}).</p>
        <p>Meta API Setup tokens expire about every 24 hours. Paste a new token in Growvisi — you do not need to disconnect your number.</p>
        <p><a href="${opts.settingsUrl}">Refresh token in Settings</a></p>
        <p>Steps: Meta Developer → WhatsApp → API Setup → Generate access token → paste under <strong>Refresh access token</strong>.</p>
        <p>Need help? Reply to this email or contact ${GROWVISI_EMAIL_SUPPORT}</p>
      `,
      replyTo: GROWVISI_EMAIL_SUPPORT,
    });
  }

  async sendWhatsappTokenHeadsUp(opts: {
    to: string[];
    organizationName: string;
    displayPhoneNumber: string;
    hoursRemaining: number;
    settingsUrl: string;
  }): Promise<void> {
    await this.sendRaw({
      to: opts.to,
      subject: `Reminder: WhatsApp token for ${opts.displayPhoneNumber} expires in ~${Math.ceil(opts.hoursRemaining)}h`,
      html: `
        <p>Hi,</p>
        <p>Your Meta API Setup token for <strong>${opts.organizationName}</strong> (${opts.displayPhoneNumber}) will expire in about ${Math.ceil(opts.hoursRemaining)} hours.</p>
        <p>Refresh it now to avoid gaps in message ingestion — paste a new token in Growvisi (no need to disconnect).</p>
        <p><a href="${opts.settingsUrl}">Refresh token in Settings</a></p>
        <p>Need help? Reply to ${GROWVISI_EMAIL_SUPPORT}</p>
      `,
      replyTo: GROWVISI_EMAIL_SUPPORT,
    });
  }

  async sendHotLeadAlert(opts: {
    to: string[];
    organizationName: string;
    leadLabel: string;
    score: number;
    stage: string;
    inboxUrl: string;
  }): Promise<void> {
    await this.sendRaw({
      to: opts.to,
      subject: `Hot lead: ${opts.leadLabel} (score ${opts.score})`,
      html: `
        <p>Hi,</p>
        <p>Growvisi classified a high-intent lead in <strong>${opts.organizationName}</strong>.</p>
        <p><strong>${opts.leadLabel}</strong> — score ${opts.score}, stage ${opts.stage.replace("_", " ")}.</p>
        <p><a href="${opts.inboxUrl}">Open conversation</a></p>
      `,
      replyTo: GROWVISI_EMAIL_SUPPORT,
    });
  }

  async sendHandoffAlert(opts: {
    to: string[];
    organizationName: string;
    leadLabel: string;
    reason: string;
    inboxUrl: string;
  }): Promise<void> {
    await this.sendRaw({
      to: opts.to,
      subject: `Handoff needed: ${opts.leadLabel}`,
      html: `
        <p>Hi,</p>
        <p>Growvisi flagged a conversation in <strong>${opts.organizationName}</strong> that needs a human.</p>
        <p><strong>${opts.leadLabel}</strong> — ${opts.reason}</p>
        <p>A follow-up task was created in Growvisi. Reply from Inbox when you take over, or continue in WhatsApp.</p>
        <p><a href="${opts.inboxUrl}">Open conversation</a></p>
      `,
      replyTo: GROWVISI_EMAIL_SUPPORT,
    });
  }

  async sendFollowupReminder(opts: {
    to: string[];
    organizationName: string;
    count: number;
    inboxUrl: string;
  }): Promise<void> {
    await this.sendRaw({
      to: opts.to,
      subject: `${opts.count} conversation${opts.count > 1 ? "s" : ""} need follow-up — ${opts.organizationName}`,
      html: `
        <p>Hi,</p>
        <p>${opts.count} WhatsApp conversation${opts.count > 1 ? "s have" : " has"} been waiting over 24 hours without a team reply.</p>
        <p><a href="${opts.inboxUrl}">Review conversations</a></p>
      `,
      replyTo: GROWVISI_EMAIL_SUPPORT,
    });
  }

  async sendStageChangeAlert(opts: {
    to: string[];
    organizationName: string;
    leadLabel: string;
    fromStage: string;
    toStage: string;
    changedBy: string;
    pipelineUrl: string;
    inboxUrl: string;
  }): Promise<void> {
    const fmt = (s: string) => s.replace(/_/g, " ").toLowerCase();
    await this.sendRaw({
      to: opts.to,
      subject: `Pipeline: ${opts.leadLabel} → ${fmt(opts.toStage)}`,
      html: `
        <p>Hi,</p>
        <p><strong>${opts.changedBy}</strong> moved <strong>${opts.leadLabel}</strong> in <strong>${opts.organizationName}</strong>.</p>
        <p>${fmt(opts.fromStage)} → <strong>${fmt(opts.toStage)}</strong></p>
        <p>
          <a href="${opts.pipelineUrl}">View pipeline</a>
          &nbsp;·&nbsp;
          <a href="${opts.inboxUrl}">Open conversation</a>
        </p>
      `,
      replyTo: GROWVISI_EMAIL_SUPPORT,
    });
  }

  async sendStaleDealReminder(opts: {
    to: string[];
    organizationName: string;
    count: number;
    pipelineUrl: string;
    tasksUrl: string;
  }): Promise<void> {
    await this.sendRaw({
      to: opts.to,
      subject: `${opts.count} stale deal${opts.count > 1 ? "s" : ""} need attention — ${opts.organizationName}`,
      html: `
        <p>Hi,</p>
        <p>Growvisi found <strong>${opts.count}</strong> open deal${opts.count > 1 ? "s" : ""} with no progress — either waiting on a reply or sitting too long in the same stage.</p>
        <p>Follow-up tasks were created for your team.</p>
        <p>
          <a href="${opts.pipelineUrl}">Review stale deals</a>
          &nbsp;·&nbsp;
          <a href="${opts.tasksUrl}">Open tasks</a>
        </p>
      `,
      replyTo: GROWVISI_EMAIL_SUPPORT,
    });
  }

  async sendDailyDigest(opts: {
    to: string[];
    organizationName: string;
    dashboardUrl: string;
    inboxUrl: string;
    insightsUrl: string;
    pipelineInr: number;
    wonYesterday: number;
    handoffs: number;
    unread: number;
    overdueTasks: number;
    hotLeads: Array<{
      label: string;
      score: number;
      stage: string;
      nextAction: string | null;
    }>;
    teamWorkload: Array<{ name: string; openTasks: number }>;
  }): Promise<void> {
    const formatInr = (n: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);

    const hotRows =
      opts.hotLeads.length > 0
        ? opts.hotLeads
            .map(
              (l) =>
                `<tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>${l.label}</strong><br/><span style="color:#666;font-size:12px">${l.stage} · score ${l.score}</span></td><td style="padding:8px;border-bottom:1px solid #eee;font-size:12px">${l.nextAction ?? "—"}</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="2" style="padding:12px;color:#666">No hot leads right now — keep conversations flowing.</td></tr>`;

    const teamRows =
      opts.teamWorkload.length > 0
        ? opts.teamWorkload
            .map(
              (t) =>
                `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${t.name}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${t.openTasks} open</td></tr>`,
            )
            .join("")
        : "";

    await this.sendRaw({
      to: opts.to,
      subject: `Your Growvisi morning brief — ${opts.organizationName}`,
      html: `
        <div style="font-family:Inter,Segoe UI,sans-serif;max-width:560px;color:#0b1c30">
          <p style="font-size:14px">Good morning,</p>
          <p style="font-size:14px">Here's your WhatsApp revenue snapshot for <strong>${opts.organizationName}</strong>.</p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8f9ff;border-radius:12px">
            <tr>
              <td style="padding:16px;width:50%"><p style="margin:0;font-size:11px;text-transform:uppercase;color:#006c49;font-weight:700">Open pipeline</p><p style="margin:4px 0 0;font-size:22px;font-weight:700">${formatInr(opts.pipelineInr)}</p></td>
              <td style="padding:16px;width:50%"><p style="margin:0;font-size:11px;text-transform:uppercase;color:#006c49;font-weight:700">Won (24h)</p><p style="margin:4px 0 0;font-size:22px;font-weight:700">${opts.wonYesterday}</p></td>
            </tr>
          </table>

          <p style="font-size:13px;font-weight:700;margin-bottom:8px">Needs attention</p>
          <ul style="font-size:13px;line-height:1.6;padding-left:18px">
            ${opts.handoffs > 0 ? `<li><strong>${opts.handoffs}</strong> handoff${opts.handoffs > 1 ? "s" : ""} waiting for your team</li>` : ""}
            ${opts.unread > 0 ? `<li><strong>${opts.unread}</strong> unread message${opts.unread > 1 ? "s" : ""}</li>` : ""}
            ${opts.overdueTasks > 0 ? `<li><strong>${opts.overdueTasks}</strong> overdue task${opts.overdueTasks > 1 ? "s" : ""}</li>` : ""}
            ${opts.handoffs === 0 && opts.unread === 0 && opts.overdueTasks === 0 ? "<li>You're on track — no urgent items.</li>" : ""}
          </ul>

          <p style="font-size:13px;font-weight:700;margin:20px 0 8px">Hot leads</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">${hotRows}</table>

          ${teamRows ? `<p style="font-size:13px;font-weight:700;margin:20px 0 8px">Team workload</p><table style="width:100%;border-collapse:collapse;font-size:13px">${teamRows}</table>` : ""}

          <p style="margin:24px 0">
            <a href="${opts.dashboardUrl}" style="display:inline-block;background:#006c49;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">Open dashboard</a>
            &nbsp;
            <a href="${opts.inboxUrl}" style="font-size:13px;color:#006c49">Conversations</a>
            &nbsp;
            <a href="${opts.insightsUrl}" style="font-size:13px;color:#006c49">Recommendations</a>
          </p>
          <p style="font-size:11px;color:#888">Growvisi tracks pipeline and team actions. Your team replies from Inbox when customers need a human. Turn off this email in Automations → Daily digest.</p>
        </div>
      `,
      replyTo: GROWVISI_EMAIL_SUPPORT,
    });
  }

  async sendTeamInvite(opts: {
    to: string;
    organizationName: string;
    inviteUrl: string;
    role: MembershipRole | string;
  }): Promise<boolean> {
    const roleLabel = roleUiLabel(
      (typeof opts.role === "string" ? opts.role : opts.role) as MembershipRole,
    );
    return this.sendRaw({
      to: [opts.to],
      subject: `You're invited to ${opts.organizationName} on Growvisi`,
      html: `
        <div style="font-family:Inter,Segoe UI,sans-serif;max-width:560px;color:#0b1c30">
          <p style="font-size:14px">Hi,</p>
          <p style="font-size:14px">You've been invited to join <strong>${opts.organizationName}</strong> on Growvisi as <strong>${roleLabel}</strong>.</p>
          <p style="margin:24px 0">
            <a href="${opts.inviteUrl}" style="display:inline-block;background:#006c49;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Accept invite</a>
          </p>
          <p style="font-size:13px;color:#555">This link expires in 7 days. Your team replies from Inbox when customers need a human — Growvisi tracks pipeline and handoffs.</p>
          <p style="font-size:12px;color:#aaa;margin-top:24px">Growvisi · WhatsApp revenue for Indian SMBs<br/>growvisi.in</p>
        </div>
      `,
      replyTo: GROWVISI_EMAIL_SUPPORT,
    });
  }

  async sendRaw(opts: {
    to: string[];
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
  }): Promise<boolean> {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("EMAIL_FROM") ?? GROWVISI_EMAIL_FROM;
    const isProd = this.config.get<string>("NODE_ENV") === "production";

    if (!apiKey) {
      this.logger.warn(`Email (dev) ${opts.subject} → ${opts.to.join(", ")}`);
      if (isProd) {
        throw new Error("Email service is not configured.");
      }
      return false;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        reply_to: opts.replyTo,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Resend failed (${res.status}): ${body}`);
      throw new Error("Could not send email. Try again later.");
    }
    return true;
  }
}
