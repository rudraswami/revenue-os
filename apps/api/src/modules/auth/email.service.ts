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
