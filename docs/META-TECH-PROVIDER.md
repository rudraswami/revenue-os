# Meta Tech Provider — complete Growvisi setup

**Revenue OS** app ID: `1694805491426991`

Embedded Signup (**Continue with Facebook**) only works after Meta approves you as a **Tech Provider (TP)** or **Business Solution Partner (BSP)**. Until then, Meta shows:

> *Embedded signup is only available for BSPs or TPs*

Use **Connect with Meta API Setup** in Growvisi onboarding/settings to test Inbox while waiting.

---

## Tech Provider page is blank?

Meta’s dashboard sometimes renders an empty page. Do the same steps via these paths:

| Step | Where to go |
|------|-------------|
| **1. Required actions** | Top bar → **Required actions** (red badge) — complete anything listed |
| **2. Business verification** | [business.facebook.com/settings/info](https://business.facebook.com/settings/info) → verify **Growvisi** portfolio |
| **3. App Review** | [App Review](https://developers.facebook.com/apps/1694805491426991/app-review/) → request **Advanced** access for `whatsapp_business_messaging` and `whatsapp_business_management` |
| **4. Tech Provider (alt)** | Use cases → WhatsApp → **Quickstart** → **Become a Tech Provider** card → Start onboarding |
| **5. App Basic** | App settings → Basic — icon, privacy, terms, data deletion (already on growvisi.in) |
| **6. Webhook** | Use cases → WhatsApp → **Configuration** — verify URL + subscribe `messages` |

**If still blank:** try Chrome incognito, disable ad blockers, or another browser. This is a Meta UI bug — the steps above are equivalent to Tech Provider onboarding.

---

## Order of operations

```text
1. Business verification (Growvisi portfolio)
2. App Review (whatsapp permissions, demo videos)
3. Tech Provider approval
4. Publish app (last)
5. Continue with Facebook works for customers
```

Typical wait: **several days to 2 weeks** after submitting documents.

---

## App Review checklist

Submit from [App Review](https://developers.facebook.com/apps/1694805491426991/app-review/):

| Permission | Why |
|--------------|-----|
| `whatsapp_business_messaging` | Send/receive messages for customers |
| `whatsapp_business_management` | Access customer WABAs |

**Videos Meta may require:**

1. Message sent from your app (or API Setup curl) → received on WhatsApp
2. Template created (app or WhatsApp Manager screen recording)

**Reviewer notes (example):**

```text
Growvisi (https://www.growvisi.in) is a WhatsApp CRM.
Login: [test email] / [test password]
Settings → Connect WhatsApp → Continue with Facebook
Webhook: https://api.growvisi.in/api/v1/webhooks/whatsapp
```

---

## Test Inbox before Tech Provider approval

1. Meta → Revenue OS → Use cases → WhatsApp → **API Setup**
2. Note **Phone number ID**, **WABA ID**, generate **temporary access token**
3. Growvisi onboarding → **Connect with Meta API Setup (testing)**
4. Send WhatsApp to the test number → check **Inbox**

Temporary tokens expire (~24h). For long-term testing, regenerate in API Setup.

---

## After Tech Provider is approved

1. **Continue with Facebook** in Growvisi will open full Embedded Signup (no BSP/TP error)
2. Customers can self-serve connect their own WABA + phone
3. Remove or hide manual API Setup path for end users if desired

---

## Links

- [Become a Tech Provider (Meta docs)](https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers)
- [Embedded Signup](./META-EMBEDDED-SIGNUP.md)
- [Facebook Login domains](./META-FACEBOOK-GROWVISI.md)
