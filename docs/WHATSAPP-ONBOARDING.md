# WhatsApp onboarding — customer & ops guide

Growvisi ingests messages from **your existing** WhatsApp Business number on Meta’s Cloud API. After App Review, customers connect with **Continue with Facebook** (Embedded Signup). During review, admins can paste a temporary token from Meta API Setup. Growvisi verifies the number, subscribes webhooks, classifies inbound chats, and tracks pipeline — your team replies from **Conversations** when customers need a human.

## Customer flow (self-serve)

### Recommended — Embedded Signup (post App Review)

1. Sign in at [www.growvisi.in](https://www.growvisi.in) and open **Onboarding** (or **Settings → WhatsApp**).
2. Choose how you use WhatsApp today:
   - **WhatsApp Business API number** — standard Cloud API line
   - **WhatsApp Business app (keep the app)** — Coexistence (CoEx); team keeps the mobile app, Growvisi classifies inbound
3. Click **Continue with Facebook** and sign in with the Meta account that manages your WhatsApp Business.
4. Select your business line in the Meta popup — takes about 2 minutes.
5. Complete the **Go-live checklist** on screen:
   - Webhooks subscribed
   - First customer message (test from your personal phone)
   - First AI classification
   - Deal tracked in Pipeline (stage or ₹ value)
   - Message templates synced from Meta (for Campaigns)
6. Open **Conversations** to see classified threads.

**Multi-number:** Growth plan supports 3 lines; Pro supports 50. Use **Add another number** in Settings → WhatsApp when under your plan limit.

**Agency (Pro):** From **Agency → Clients**, use **Connect WhatsApp** on a client card to switch into their workspace and run onboarding.

### During App Review — Meta API Setup token

1. In [Meta Developers](https://developers.facebook.com/) → your app → **WhatsApp → API Setup**, copy the **temporary access token** (`EAA…`).
2. On Growvisi onboarding, expand **During App Review: connect with Meta API Setup token**.
3. Paste the token — we auto-discover phone numbers on the WABA.
4. If multiple numbers exist, pick the business line to connect.
5. Complete the same **Go-live checklist** as above.

**Concierge help:** tap the green **Setup assistant** button (bottom-left) on onboarding or Connection — quick answers, AI setup help, or email **support@growvisi.in** (Mon–Sat IST).

## Setup assistant (Phase B)

On **Onboarding**, **Connection**, and **Settings → WhatsApp**, the green help button offers:

1. **Quick answers** — curated FAQs (phone vs API, tokens, test messages)
2. **Ask assistant** — LLM grounded in Growvisi setup docs + your workspace onboarding/connection snapshot (requires `OPENAI_API_KEY` on API)
3. **Human escalation** — book a free setup call or email support@growvisi.in

The assistant helps **merchants connect WhatsApp** — it does not draft replies to your customers.

## Prerequisites (Meta)

| Requirement | Notes |
|-------------|--------|
| Meta Business account | Owner or admin on the WABA |
| WhatsApp Business number on Cloud API | Standard Embedded Signup path |
| WhatsApp Business mobile app | CoEx path — select **keep the app** before Facebook connect |
| Revenue OS Meta app | App ID `1694805491426991` |
| Webhook URL (Growvisi) | `https://api.growvisi.in/api/v1/webhooks/whatsapp` (configured server-side) |
| Webhook fields | `messages` + `account_update` (phone verification, async signup completion) |

## Token lifecycle

| Connect method | Token type | Refresh |
|----------------|------------|---------|
| Embedded Signup | Long-lived via code exchange | Auto-refresh cron + Settings banner |
| API Setup paste | Short-lived (~24h) | Settings → **Refresh token** (paste new `EAA…`) |

| Stage | When | What happens |
|-------|------|----------------|
| **OK** | >20h remaining | No banner |
| **Soon** | <20h remaining | Blue dashboard banner + optional heads-up email |
| **Urgent** | <4h or invalid | Amber banner + urgent reminder email |

## Ops — API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/whatsapp-accounts/onboarding-readiness` | Webhook URL, verify token, Meta deep link |
| `GET` | `/organizations/onboarding-progress` | Activation steps + nested `goLive` checklist (preferred) |
| `GET` | `/whatsapp-accounts/onboarding-progress` | Go-live checklist only (deprecated — use org endpoint) |
| `GET` | `/whatsapp-accounts/embedded-signup/config` | Facebook SDK config for one-click connect |
| `POST` | `/whatsapp-accounts/embedded-signup/complete` | Finish Embedded Signup after Meta popup |
| `POST` | `/whatsapp-accounts/quick-connect` | Discover + verify + subscribe + save (token path) |
| `POST` | `/agency/clients/:organizationId/quick-connect` | Agency hub: token connect for a client workspace in-place |
| `POST` | `/whatsapp-accounts/:id/refresh-token` | Replace access token |
| `GET` | `/whatsapp-accounts/connection-health` | Diagnostics + `tokenHealth` |
| `GET` | `/support/capabilities` | `{ setupHelpLlm: boolean }` — LLM setup assistant online |
| `POST` | `/support/setup-help` | JWT; body `{ context, message, history?, locale? }` — merchant setup Q&A (not customer chat) |
| `GET` | `/internal/cron/whatsapp-token-reminders` | Cron: email owners (auth required) |
| `GET` | `/internal/cron/whatsapp-token-refresh` | Cron: auto-exchange long-lived tokens |

## Ops — Vercel cron

Schedule is defined in `apps/api/vercel.json` (daily on Hobby; every 6h on Pro):

**Required env on API project:**

```bash
CRON_SECRET=<openssl rand -base64 32>
RESEND_API_KEY=<resend key>
EMAIL_FROM=Growvisi <noreply@growvisi.in>
META_APP_ID=1694805491426991
META_APP_SECRET=<app secret>
WHATSAPP_EMBEDDED_SIGNUP_LIVE=true   # after App Review (false hides Facebook CTA)
```

Vercel sends `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`) — see `cron-secret.guard.ts`.

## Ops — troubleshooting

| Symptom | Check |
|---------|--------|
| No messages after connect | Go-live checklist → webhooks step; message from **personal** phone, not Meta test UI |
| Token invalid immediately | Regenerate in API Setup; ensure WABA still has the number |
| Multiple numbers error | Use phone picker after discover; pass `phoneNumberId` to quick-connect |
| Embedded Signup blocked | Meta App roles, Allowed Domains, Data Use Checkup — see `docs/META-FACEBOOK-GROWVISI.md` |
| Facebook CTA hidden | `WHATSAPP_EMBEDDED_SIGNUP_LIVE=false` — use token path during review |
| Phone verified in Meta but not in Growvisi | Ensure `account_update` webhook field subscribed; check connection health |

## Meta App Review

Screencast script: [META-APP-REVIEW-SCREENCAST.md](./META-APP-REVIEW-SCREENCAST.md)

Reviewer account (seeded): `meta.reviewer@growvisi.in` / workspace `meta-review-demo`.

After approval, set `WHATSAPP_EMBEDDED_SIGNUP_LIVE=true` on API for one-click Facebook connect.

## Related files

- Connect UI: `apps/web/src/components/settings/whatsapp-connect.tsx`
- Go-live checklist: `apps/web/src/components/settings/whatsapp-go-live-checklist.tsx`
- Embedded Signup API: `apps/api/src/modules/whatsapp-accounts/embedded-signup.service.ts`
- Webhooks: `apps/api/src/modules/whatsapp/whatsapp.service.ts` (`messages` + `account_update`)
- Token banner: `apps/web/src/components/dashboard/whatsapp-token-expiry-banner.tsx`
