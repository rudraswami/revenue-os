# Meta Embedded Signup — operator setup

Customers click **Continue with Facebook** in Settings. This doc is for **you** (Growvisi operator), not end users.

## Prerequisites

1. [Meta Developer app](https://developers.facebook.com/apps/) with **WhatsApp** product
2. [Tech Provider](https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers) or Solution Partner status (required for production onboarding)
3. Public HTTPS webhook already working (`WEBHOOK_PUBLIC_URL`, `WHATSAPP_VERIFY_TOKEN`)

## Meta App Dashboard

### 1. Facebook Login for Business → Settings

- Client OAuth login: **Yes**
- Web OAuth login: **Yes**
- Enforce HTTPS: **Yes**
- Embedded Browser OAuth Login: **Yes**
- Login with JavaScript SDK: **Yes**
- **Allowed domains:** `localhost`, `growvisi.com`, `www.growvisi.com`  
  See **[META-FACEBOOK-GROWVISI.md](./META-FACEBOOK-GROWVISI.md)** if you get **JSSDK unknown error** after changing domains.
- **Valid OAuth redirect URIs:** same origins with `https://`

### 2. Create configuration (Embedded Signup v4)

Facebook Login for Business → **Configurations** → Create from template  
**WhatsApp Embedded Signup Configuration With 60 Expiration Token**

Copy the **Configuration ID**.

### 3. Environment variables

```env
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_EMBEDDED_SIGNUP_CONFIG_ID=your-config-id
WHATSAPP_APP_SECRET=your-app-secret
WEBHOOK_PUBLIC_URL=https://api.growvisi.com
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_API_VERSION=v21.0

# Optional — only needed for brand-new Cloud API numbers
META_WABA_REGISTER_PIN=123456
```

Restart API after changes.

## What happens when a customer connects

1. Customer clicks **Continue with Facebook**
2. Meta popup — login, pick business, pick/verify WhatsApp number
3. Browser receives `code` + `phone_number_id` + `waba_id`
4. Growvisi server (within 30 seconds):
   - Exchanges code → business token
   - Subscribes app webhooks on customer WABA
   - Optionally registers phone (if `META_WABA_REGISTER_PIN` set)
   - Saves encrypted token + number in database
5. Customer sees success + “Send a test message”

## Testing

1. Add yourself as **Admin/Developer** on the Meta app
2. Run web on HTTPS or `localhost` (listed in allowed domains)
3. Settings → Continue with Facebook
4. Send test WhatsApp → Inbox

## Customer payment

After first connect, customer may need a payment method in [WhatsApp Manager](https://business.facebook.com/wa/manage/home/) for messaging beyond free tier.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Popup blocked | Allow popups for your domain |
| "Setup coming soon" in app | Set `META_APP_ID` + `META_EMBEDDED_SIGNUP_CONFIG_ID` + secret |
| Code exchange fails | Code expires in 30s — retry connect |
| No messages in Inbox | Check `WEBHOOK_PUBLIC_URL` + WABA subscribed (auto on connect) |
| Domain not allowed | Add domain in Meta OAuth settings |
| BSP/TP / Embedded signup not available | Complete [Tech Provider](./META-TECH-PROVIDER.md); use API Setup manual connect until approved |

Docs: [Embedded Signup implementation](https://developers.facebook.com/docs/whatsapp/embedded-signup/implementation/)
