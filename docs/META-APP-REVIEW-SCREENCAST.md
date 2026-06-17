# Meta App Review — screencast script

Record **2 videos** (1080p, English UI, no cuts). Upload in [App Review](https://developers.facebook.com/apps/1694805491426991/app-review/).

**Positioning:** Growvisi = conversation intelligence. Meta Business Agent replies in WhatsApp.

---

## Video 1 — End-to-end product (3–5 min)

| Step | Screen | Narration |
|------|--------|-----------|
| 1 | `https://www.growvisi.in` landing | "Growvisi ingests WhatsApp customer messages for classification and pipeline tracking." |
| 2 | Footer → Privacy, Terms, Data deletion | "Legal pages for Meta and customers." |
| 3 | Register or login reviewer account | Use credentials below |
| 4 | Dashboard → Conversations | "Inbound messages appear via Cloud API webhooks." |
| 5 | Send WhatsApp **from personal phone to business test number** | Show message arriving in Conversations |
| 6 | Intelligence / Pipeline | "AI classifies intent and tracks lead stage." |
| 7 | Settings → WhatsApp | "Connect via Meta API Setup or Facebook after approval." |
| 8 | Settings → Delete account (show UI, do not delete) | "Users can delete account and workspace data." |

---

## Video 2 — WhatsApp permission proof (1–2 min)

| Step | Screen |
|------|--------|
| 1 | Meta API Setup curl OR Growvisi optional human reply | Show message flow |
| 2 | WhatsApp on phone | Message received |
| 3 | Growvisi Conversations | Same thread visible |

---

## Reviewer test account (create before submit)

Create a **dedicated** account — do not use your personal login.

| Field | Value |
|-------|--------|
| URL | `https://www.growvisi.in/register` |
| Email | `meta.reviewer@growvisi.in` |
| Password | *(strong, store in password manager)* |
| Workspace | `Meta Review Demo` |

**Before recording:**

1. Settings → Connect via Meta Developer (Phone ID + WABA + token from API Setup)
2. Send one inbound test message so Conversations is not empty
3. Add reviewer Facebook account as App **Developer** if they test Embedded Signup

Paste into App Review **notes**:

```text
Growvisi — WhatsApp conversation intelligence (https://www.growvisi.in)
We ingest messages via webhooks, classify leads, track pipeline. Meta Business Agent handles in-chat replies.

Login: meta.reviewer@growvisi.in / [PASSWORD]
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

After approval: set `WHATSAPP_EMBEDDED_SIGNUP_LIVE=true` on API and redeploy.
