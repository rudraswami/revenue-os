# Meta App Review — final recording guide

Use this when you are **ready to submit**. Meta requires **one written description + one dedicated screencast per permission** — not a single combined tour.

**App:** [Growvisi Meta Developer App](https://developers.facebook.com/apps/1694805491426991/app-review/)  
**Product:** https://www.growvisi.in  
**Positioning:** Growvisi = WhatsApp **conversation intelligence** (ingest, classify, pipeline). **Meta Business Agent** handles automated replies inside WhatsApp. Growvisi optional **human takeover** send from the dashboard.

---

## Ready checklist (do this before recording)

| # | Task | How to verify |
|---|------|----------------|
| 1 | Production web + API deployed | `pnpm --filter @growvisi/web build` passes; Vercel shows latest deploy |
| 2 | Fresh Meta temp token pasted | Settings → WhatsApp → paste token → **Connect automatically** → green health |
| 3 | **No token expiry banner** | Banner must be gone (token valid, >4h left). Re-paste if needed |
| 4 | Test recipient configured | Meta → WhatsApp → API Setup → add **your personal phone** as test recipient |
| 5 | Inbound works | Personal phone → message **your business number** → appears in Conversations within ~10s |
| 6 | Outbound works | Growvisi Conversations → human takeover → Send → message on personal phone |
| 7 | Reviewer account works | Login below on production |
| 8 | Browser | Chrome, **English UI**, 1080p display, window ≤1440px wide |
| 9 | Recording | OBS / Loom, MP4, clear cursor, no password/token visible on screen |

**Do NOT record:** expired-token banners, auth errors, failed sends, blank inbox layout, or Meta’s generic “Send test message” button as your only outbound proof.

---

## Reviewer test account

| Field | Value |
|-------|--------|
| Login URL | https://www.growvisi.in/login |
| Email | `meta.reviewer@growvisi.in` |
| Password | `MetaReview2026!Growvisi` |
| Workspace | `Meta Review Demo` |
| Onboarding | https://www.growvisi.in/onboarding |

Paste into App Review **notes**:

```text
Growvisi — WhatsApp conversation intelligence for SMB sales teams.
https://www.growvisi.in

We are an Independent Tech Provider. Businesses connect their existing WhatsApp Business number.
Growvisi ingests customer messages via Cloud API webhooks, classifies leads, and tracks pipeline.
Meta Business Agent handles automated in-chat replies; Growvisi provides team inbox, analytics, and optional human-agent replies.

Login: meta.reviewer@growvisi.in / MetaReview2026!Growvisi
Onboarding: https://www.growvisi.in/onboarding
Webhook: https://api.growvisi.in/api/v1/webhooks/whatsapp
Privacy: https://www.growvisi.in/privacy
Terms: https://www.growvisi.in/terms
Data deletion: https://www.growvisi.in/data-deletion
Meta data deletion callback: https://api.growvisi.in/api/v1/webhooks/meta/data-deletion
```

---

## Permissions to request

| Permission | Growvisi use |
|------------|----------------|
| `whatsapp_business_management` | Connect customer WABA: discover phone numbers, subscribe webhooks, store encrypted tokens, refresh tokens |
| `whatsapp_business_messaging` | Receive inbound messages (webhooks) + optional human-agent replies within 24h window |
| `public_profile` | Minimal OAuth field during Embedded Signup only (if requested) |

Request **Advanced access** for messaging + management.

---

## Video 1 — `whatsapp_business_management` (2–4 min)

**Meta expects:** Evidence that your **business-facing app** uses this permission to manage WhatsApp business assets (WABA, phone numbers, webhooks) on behalf of customers.

**Upload:** App Review → Permissions → `whatsapp_business_management` → Complete form → Upload file.

### Written description (copy-paste)

```text
Growvisi is an Independent Tech Provider. Our customers connect their existing WhatsApp Business Account to Growvisi so we can subscribe their number to Cloud API webhooks and manage connection credentials on their behalf.

We use whatsapp_business_management to:
1) Discover the customer's business phone number and WABA after they authorize us (API Setup token paste or Embedded Signup).
2) Subscribe the app to the customer's WABA webhooks so inbound customer messages are delivered to Growvisi.
3) Store and refresh encrypted access tokens when Meta temporary tokens expire, without disconnecting the number.

We do not sell customer data. Businesses control their own WABA in Meta; Growvisi only accesses assets they explicitly connect.
```

### Recording script (step by step)

| Step | Time | What to show | Say (optional narration) |
|------|------|--------------|--------------------------|
| 1 | 0:00 | Browser → `growvisi.in/login` → login as reviewer | “This is Growvisi, our business dashboard.” |
| 2 | 0:20 | Sidebar → **Settings** → scroll to **WhatsApp** section | “Customers connect their WhatsApp Business number here.” |
| 3 | 0:40 | Open second tab: Meta Developers → your app → **WhatsApp → API Setup** | “User copies a temporary token from Meta API Setup.” |
| 4 | 1:00 | Copy token (blur or cut paste action) → Growvisi → paste → **Connect automatically** | “Growvisi uses whatsapp_business_management to discover the WABA and phone number.” |
| 5 | 1:30 | Show success: connected number, verified name, **Connection health** green | “Webhook subscription and token storage completed.” |
| 6 | 2:00 | Show **Refresh token** UI (paste new token, save — or show UI only) | “When Meta tokens expire, users refresh without reconnecting.” |
| 7 | 2:30 | Settings → link to **Privacy** / **Data deletion** (quick flash) | “Customers can delete workspace data per our policy.” |

**Fallback if reviewer asks for template management:** Record an extra 60s in Meta **WhatsApp Manager → Message templates → Create template**. Growvisi’s primary management flow is WABA connect + webhooks; templates are managed in Meta today.

**Do not:** Show raw tokens, app secrets, or `.env` files.

---

## Video 2 — `whatsapp_business_messaging` (2–4 min)

**Meta expects:** Your **business application interface** sending a message, and the **WhatsApp client** (phone or Web) receiving it. Also demonstrate receiving inbound messages into your app.

**Upload:** App Review → Permissions → `whatsapp_business_messaging` → Complete form → Upload file.

### Written description (copy-paste)

```text
Growvisi uses whatsapp_business_messaging so businesses can receive customer WhatsApp messages in a shared team inbox and optionally send human-agent replies when a team member takes over a conversation.

Inbound: Customer messages the business WhatsApp number → Meta Cloud API webhook → message appears in Growvisi Conversations within seconds.

Outbound: Authorized team members send a reply from Growvisi’s Conversations composer (human takeover) → message is delivered to the customer’s WhatsApp. Automated replies in WhatsApp are handled by Meta Business Agent; Growvisi does not replace Meta’s in-chat AI.

We only message customers who contacted the business first (24-hour session window). No bulk or unsolicited messaging.
```

### Recording script (step by step)

| Step | Time | What to show | Say (optional narration) |
|------|------|--------------|--------------------------|
| 1 | 0:00 | Login → **Conversations** (`/dashboard/inbox`) | “Shared team inbox — contact list stays visible while reading a thread.” |
| 2 | 0:20 | Show **3-column layout**: list \| thread \| timeline (wide window) | “All conversations remain visible on desktop.” |
| 3 | 0:40 | **Phone:** WhatsApp → message **to business number** (e.g. “App Review inbound test”) | “Customer sends inbound message to the business.” |
| 4 | 1:10 | **Growvisi:** same thread updates with inbound bubble (wait for sync) | “whatsapp_business_messaging webhook — message ingested.” |
| 5 | 1:40 | Show stage badge / **Timeline** (AI classify if present) | “Growvisi classifies intent for the sales pipeline.” |
| 6 | 2:00 | Composer → type unique text: `Growvisi human takeover — review demo` → click **Send** | “Human agent reply sent via Cloud API from Growvisi.” |
| 7 | 2:30 | **Phone:** open chat with business → **outbound message visible** | “Message received on the customer WhatsApp client.” |
| 8 | 2:50 | Back to Growvisi — outbound bubble in thread | “Send confirmed in business dashboard.” |

**Critical rules:**

- **Must** show at least one **live Send click** from Growvisi composer (not only Meta API Setup test send).
- **Must** show message on **WhatsApp client** after send.
- Inbound proof must be **phone → business number**, not Meta dashboard “Send test message” alone.
- Record the **business dashboard** (Growvisi), not only the consumer phone screen.

---

## Optional Video 3 — Full product context (not required by Meta)

Use for your own archive or support email if reviewers want more context. **Do not** substitute this for Videos 1 & 2.

| Step | Screen |
|------|--------|
| 1 | Marketing home → Privacy / Terms footer |
| 2 | Register or reviewer login |
| 3 | Onboarding wizard (overview → token → verify) |
| 4 | Conversations → Pipeline → Analytics |
| 5 | Settings → Automations (Meta welcome disclosure) |
| 6 | Settings → Delete account UI (do not delete) |

---

## Meta App Dashboard fields

| Field | URL |
|-------|-----|
| Privacy Policy | https://www.growvisi.in/privacy |
| Terms | https://www.growvisi.in/terms |
| User data deletion | https://www.growvisi.in/data-deletion |
| Data deletion callback | https://api.growvisi.in/api/v1/webhooks/meta/data-deletion |
| App domains | `growvisi.in`, `www.growvisi.in` |
| Webhook callback | https://api.growvisi.in/api/v1/webhooks/whatsapp |

---

## Submission flow

1. [App Review → Permissions and Features](https://developers.facebook.com/apps/1694805491426991/app-review/permissions/)
2. Request **Advanced access** for `whatsapp_business_management` and `whatsapp_business_messaging`
3. For **each** permission: paste written description + upload **its own** video
4. Add reviewer notes (credentials block above)
5. **Submit for review**

After approval: set `WHATSAPP_EMBEDDED_SIGNUP_LIVE=true` on API and redeploy for production Embedded Signup.

---

## Troubleshooting during recording

| Problem | Fix |
|---------|-----|
| Token expiry banner | Settings → paste fresh token from Meta API Setup |
| Can’t message Meta test number | Message your **real connected business number** from personal phone |
| Inbound not appearing | Check webhook subscribed; Connection health; send from phone not Meta test UI |
| Outbound fails | Refresh token; confirm number active; check 24h window (customer messaged first) |
| List disappears when chat open | Deploy latest inbox UI (master-detail: list always visible on md+) |

---

## References

- [Meta App Review (WhatsApp Embedded Signup)](https://developers.facebook.com/docs/whatsapp/embedded-signup/app-review/)
- [Sample submission (permission descriptions)](https://developers.facebook.com/docs/whatsapp/embedded-signup/app-review/sample-submission/)
- [Growvisi policy alignment](./META-POLICY-ALIGNMENT.md)
- [Embedded Signup operator setup](./META-EMBEDDED-SIGNUP.md)
