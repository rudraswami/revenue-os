# Meta App Review — screencast script

Record **2 videos** (1080p, English UI, no cuts). Upload in [App Review](https://developers.facebook.com/apps/1694805491426991/app-review/).

**Positioning:** Growvisi = conversation intelligence. Meta Business Agent replies in WhatsApp. Customers keep their existing business number.

---

## Video 1 — End-to-end product (3–5 min)

| Step | Screen | Narration |
|------|--------|-----------|
| 1 | `https://www.growvisi.in` landing | "Growvisi ingests WhatsApp customer messages for classification and pipeline tracking." |
| 2 | Footer → Privacy, Terms, Data deletion | "Legal pages for Meta and customers." |
| 3 | Register or login reviewer account | Use credentials below |
| 4 | **Onboarding wizard** → Overview | "Three steps: overview, paste Meta token, verify ingestion." |
| 5 | Paste token step | "User pastes temporary token from Meta API Setup — Growvisi auto-discovers their business number." |
| 6 | Connect automatically | "One click verifies, subscribes webhooks, saves encrypted token." |
| 7 | Verify step → Open in WhatsApp | "Customer sends test message from personal phone to business number." |
| 8 | Conversations | "Inbound message appears within seconds via Cloud API webhooks." |
| 9 | Intelligence / Pipeline | "AI classifies intent and tracks lead stage." |
| 10 | Settings → Refresh token (show UI) | "When Meta temp token expires, users paste a new token without disconnecting." |
| 11 | Settings → Delete account (show UI, do not delete) | "Users can delete account and workspace data." |

---

## Video 2 — WhatsApp permission proof (1–2 min)

| Step | Screen |
|------|--------|
| 1 | Onboarding → paste token → Connect automatically | Show successful connection |
| 2 | Personal phone → WhatsApp → message **to** business number | Inbound test |
| 3 | Growvisi Conversations | Same thread visible with classification |

**Do not** use Meta API Setup "Send test message" as proof — that is outbound only.

---

## Reviewer test account

| Field | Value |
|-------|--------|
| URL | `https://www.growvisi.in/login` |
| Email | `meta.reviewer@growvisi.in` |
| Password | `MetaReview2026!Growvisi` |
| Workspace | `Meta Review Demo` (slug: `meta-review-demo`) |

**Before recording:**

1. Settings or `/onboarding` → paste token from Meta API Setup → **Connect automatically**
2. Send one **inbound** test message (personal phone → business number)
3. Add reviewer Facebook account as App **Developer** if testing Embedded Signup

Paste into App Review **notes**:

```text
Growvisi — WhatsApp conversation intelligence (https://www.growvisi.in)
We ingest inbound customer messages via webhooks, classify leads, track pipeline.
Meta Business Agent handles in-chat replies. Customers connect their existing WABA number.

Login: meta.reviewer@growvisi.in / MetaReview2026!Growvisi
Onboarding: https://www.growvisi.in/onboarding (paste Meta API Setup token)
Webhook: https://api.growvisi.in/api/v1/webhooks/whatsapp
Data deletion: https://www.growvisi.in/data-deletion
Privacy: https://www.growvisi.in/privacy
Meta data deletion callback: https://api.growvisi.in/api/v1/webhooks/meta/data-deletion
```

---

## Meta App Dashboard fields

| Field | URL |
|-------|-----|
| Privacy Policy | `https://www.growvisi.in/privacy` |
| Terms | `https://www.growvisi.in/terms` |
| User data deletion | `https://www.growvisi.in/data-deletion` |
| Data deletion callback | `https://api.growvisi.in/api/v1/webhooks/meta/data-deletion` |
| App domains | `growvisi.in`, `www.growvisi.in` |
| Webhook | `https://api.growvisi.in/api/v1/webhooks/whatsapp` |

After approval: set `WHATSAPP_EMBEDDED_SIGNUP_LIVE=true` on API and redeploy for one-click Facebook connect.
