# WhatsApp onboarding — customer & ops guide

Growvisi ingests messages from **your existing** WhatsApp Business number on Meta’s Cloud API. Customers paste a temporary access token from Meta API Setup; Growvisi verifies the number, subscribes webhooks, and starts classifying inbound chats. Replies still go through Meta/WhatsApp — Growvisi does not send messages on your behalf in this flow.

## Customer flow (self-serve)

1. Sign in at [www.growvisi.in](https://www.growvisi.in) and open **Onboarding** (or **Settings → WhatsApp**).
2. In [Meta Developers](https://developers.facebook.com/) → your app → **WhatsApp → API Setup**, copy the **temporary access token** (`EAA…`).
3. Paste the token in Growvisi — we auto-discover phone numbers on the WABA.
4. If multiple numbers exist, pick the business line to connect.
5. Click **Connect automatically** — we verify the token, subscribe webhooks, and save the account.
6. Send a test WhatsApp **from your personal phone** to your business number; the onboarding screen confirms ingestion within ~30 seconds.

**Concierge help:** use **Book concierge help** on the onboarding page or email via the link in Settings.

## Prerequisites (Meta)

| Requirement | Notes |
|-------------|--------|
| Meta Business account | Owner or admin on the WABA |
| WhatsApp Business number on Cloud API | Not the consumer WhatsApp app |
| Revenue OS Meta app | App ID `1694805491426991` — customer grants access via API Setup token |
| Webhook URL (Growvisi) | `https://api.growvisi.in/api/v1/webhooks/whatsapp` (configured server-side) |

## Token lifecycle

Meta **API Setup** tokens are short-lived (~24 hours).

| Stage | When | What happens |
|-------|------|----------------|
| **OK** | >20h remaining | No banner |
| **Soon** | <20h remaining | Blue dashboard banner + optional heads-up email |
| **Urgent** | <4h or invalid | Amber banner + urgent reminder email |

**Refresh without disconnecting:** Settings → WhatsApp → **Refresh token** (paste new `EAA…` from API Setup).

## Ops — API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/whatsapp-accounts/onboarding-readiness` | Webhook URL, verify token, Meta deep link |
| `POST` | `/whatsapp-accounts/quick-connect` | Discover + verify + subscribe + save |
| `POST` | `/whatsapp-accounts/:id/refresh-token` | Replace access token |
| `GET` | `/whatsapp-accounts/connection-health` | Diagnostics + `tokenHealth` |
| `GET` | `/internal/cron/whatsapp-token-reminders` | Cron: email owners (auth required) |

## Ops — Vercel cron

Schedule is defined in `apps/api/vercel.json` (daily on Hobby; every 6h on Pro):

**Required env on API project:**

```bash
CRON_SECRET=<openssl rand -base64 32>
RESEND_API_KEY=<resend key>
EMAIL_FROM=Growvisi <noreply@growvisi.in>
META_APP_ID=1694805491426991
META_APP_SECRET=<app secret>
```

Vercel sends `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret`) — see `cron-secret.guard.ts`.

**Manual test (production):**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://api.growvisi.in/api/v1/internal/cron/whatsapp-token-reminders
```

## Ops — troubleshooting

| Symptom | Check |
|---------|--------|
| No messages after connect | Connection health → recent webhooks; send from **personal** phone, not business test UI |
| Token invalid immediately | Regenerate in API Setup; ensure WABA still has the number |
| Multiple numbers error | Use phone picker after discover; pass `phoneNumberId` to quick-connect |
| No reminder emails | `CRON_SECRET`, `RESEND_API_KEY`, cron enabled on Vercel Pro |
| Embedded Signup unavailable | Expected until App Review — keep manual token flow |

## Meta App Review

Screencast script: [META-APP-REVIEW-SCREENCAST.md](./META-APP-REVIEW-SCREENCAST.md)

Reviewer account (seeded): `meta.reviewer@growvisi.in` / workspace `meta-review-demo`.

After approval, set `WHATSAPP_EMBEDDED_SIGNUP_LIVE=true` on API + web for one-click Facebook connect.

## Related files

- Wizard UI: `apps/web/src/components/settings/whatsapp-connect-wizard.tsx`
- API service: `apps/api/src/modules/whatsapp-accounts/whatsapp-accounts.service.ts`
- Token banner: `apps/web/src/components/dashboard/whatsapp-token-expiry-banner.tsx`
