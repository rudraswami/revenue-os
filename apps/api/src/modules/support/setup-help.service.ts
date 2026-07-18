import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtPayload } from "@growvisi/shared";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";
import { OrganizationsService } from "../organizations/organizations.service";
import { WhatsappAccountsService } from "../whatsapp-accounts/whatsapp-accounts.service";
import { formatFaqForPrompt, SETUP_HELP_DOC_EXCERPT } from "./setup-help-knowledge";

type HelpContext = "onboarding" | "connection" | "general";

type HistoryTurn = { role: "user" | "assistant"; content: string };

@Injectable()
export class SetupHelpService {
  constructor(
    private readonly config: ConfigService,
    private readonly organizations: OrganizationsService,
    private readonly whatsappAccounts: WhatsappAccountsService,
  ) {}

  getCapabilities() {
    return {
      setupHelpLlm: !!this.config.get<string>("OPENAI_API_KEY")?.trim(),
    };
  }

  async chat(
    user: JwtPayload,
    input: {
      context: HelpContext;
      message: string;
      history?: HistoryTurn[];
      locale?: "en" | "hi";
    },
  ) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Setup assistant is offline — use quick answers or book a setup call.",
      );
    }

    const message = input.message.trim();
    if (!message) {
      throw new BadRequestException("Enter a question.");
    }

    const locale = input.locale === "hi" ? "hi" : "en";
    const history = (input.history ?? []).slice(-6);

    const [onboarding, connectionHealth] = await Promise.all([
      this.organizations.getOnboardingProgress(user.organizationId).catch(() => null),
      this.whatsappAccounts
        .getConnectionHealthForOrganization(user.organizationId)
        .catch(() => null),
    ]);

    const orgSnapshot = onboarding
      ? {
          whatsappConnected: onboarding.whatsappConnected,
          firstInbound: onboarding.firstInbound,
          aiClassified: onboarding.aiClassified,
          goLiveProgressPct: onboarding.goLive?.progressPct ?? 0,
          goLiveConnected: onboarding.goLive?.connected ?? false,
        }
      : null;

    const healthSnapshot = connectionHealth
      ? {
          inboundCount: connectionHealth.stats.inboundCount,
          tokenNeedsRefresh: connectionHealth.tokenHealth?.needsRefresh ?? false,
          tokenValid: connectionHealth.tokenHealth?.valid ?? null,
          checksOk: connectionHealth.checks.filter((c) => c.ok).map((c) => c.id),
        }
      : null;

    const systemPrompt = [
      "You are Growvisi Setup Assistant — help Indian SMB merchants connect WhatsApp and go live.",
      "SCOPE: onboarding, Meta API Setup tokens, Embedded Signup, go-live checklist, connection health, agency client setup.",
      "NEVER: draft replies to end customers, promise Growvisi auto-replies customers, or give generic CRM advice.",
      "Growvisi classifies messages and tracks pipeline; the merchant's team replies from Conversations.",
      locale === "hi"
        ? "Reply in Hindi (simple, clear). Keep product terms like Conversations, Pipeline, Meta API Setup in English when natural."
        : "Reply in clear English.",
      "Be concise (2–5 sentences). Use numbered steps when helpful.",
      "If Meta token/auth is failing or you are unsure, suggest booking a free setup call or email it@growvisi.com.",
      "",
      `Context screen: ${input.context}`,
      "",
      "=== Product knowledge ===",
      SETUP_HELP_DOC_EXCERPT,
      "",
      "=== FAQ ===",
      formatFaqForPrompt(),
      orgSnapshot ? `\n=== This workspace now ===\n${JSON.stringify(orgSnapshot)}` : "",
      healthSnapshot ? `\n=== Connection health ===\n${JSON.stringify(healthSnapshot)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const model =
      this.config.get<string>("AI_SETUP_HELP_MODEL") ??
      this.config.get<string>("AI_CHAT_MODEL") ??
      "gpt-4o-mini";

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.map((t) => ({ role: t.role, content: t.content.slice(0, 800) })),
      { role: "user", content: message },
    ];

    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          max_tokens: 400,
          messages,
        }),
      },
      25_000,
    );

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new BadRequestException(body.error?.message ?? "Setup assistant could not respond.");
    }

    const reply = body.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new BadRequestException("No response from setup assistant.");
    }

    const escalateSuggested =
      /support@growvisi|setup call|book.*call|meta.*support|cannot access|token.*invalid/i.test(
        reply,
      ) ||
      /token.*expir|webhook|app review|permission/i.test(message);

    return {
      available: true,
      reply,
      escalateSuggested,
      context: input.context,
    };
  }
}
