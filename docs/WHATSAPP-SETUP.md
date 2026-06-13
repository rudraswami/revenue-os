# WhatsApp setup (for customers)

## Connect your business number

1. Open **Settings → WhatsApp**
2. Click **Continue with Facebook**
3. Sign in with the Facebook account that manages your business
4. Select your WhatsApp Business number
5. Done — send a test message from your phone to that number

Messages appear in **Inbox** automatically.

---

## For Growvisi operators

See **[META-EMBEDDED-SIGNUP.md](./META-EMBEDDED-SIGNUP.md)** for Meta app configuration.

Server `.env` (never shown to customers):

- `META_APP_ID`, `META_APP_SECRET`, `META_EMBEDDED_SIGNUP_CONFIG_ID`
- `WEBHOOK_PUBLIC_URL`, `WHATSAPP_VERIFY_TOKEN`
