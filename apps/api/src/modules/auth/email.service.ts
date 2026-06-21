import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GROWVISI_EMAIL_FROM } from "@growvisi/shared";

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
        <p>Need help? Reply to this email or contact support@growvisi.in</p>
      `,
      replyTo: "support@growvisi.in",
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
        <p>Need help? Reply to support@growvisi.in</p>
      `,
      replyTo: "support@growvisi.in",
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
      replyTo: "support@growvisi.in",
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
      replyTo: "support@growvisi.in",
    });
  }

  async sendTeamInvite(opts: {
    to: string;
    organizationName: string;
    inviteUrl: string;
    role: string;
  }): Promise<void> {
    await this.sendRaw({
      to: [opts.to],
      subject: `You're invited to ${opts.organizationName} on Growvisi`,
      html: `
        <p>Hi,</p>
        <p>You've been invited to join <strong>${opts.organizationName}</strong> on Growvisi as <strong>${opts.role.toLowerCase()}</strong>.</p>
        <p><a href="${opts.inviteUrl}">Accept invite and create your account</a></p>
        <p>This link expires in 7 days. Growvisi helps teams classify WhatsApp leads — Meta replies in-chat, we track the pipeline.</p>
      `,
      replyTo: "support@growvisi.in",
    });
  }

  async sendRaw(opts: {
    to: string[];
    subject: string;
    text?: string;
    html?: string;
    replyTo?: string;
  }): Promise<void> {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("EMAIL_FROM") ?? GROWVISI_EMAIL_FROM;

    if (!apiKey) {
      this.logger.warn(`Email (dev) ${opts.subject} → ${opts.to.join(", ")}`);
      return;
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
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Resend failed (${res.status}): ${body}`);
      throw new Error("Could not send email. Try again later.");
    }
  }
}
