# Meta Facebook Login — growvisi.com setup

Use this when **Continue with Facebook** shows **JSSDK unknown error** or fails after moving to custom domains.

## Important: www redirect

Vercel sends **`growvisi.com` → `www.growvisi.com`**.  
Always open the app at **https://www.growvisi.com** (or configure both in Meta — see below).

---

## 1. Meta app → Facebook Login for Business → Settings

| Setting | Value |
|---------|--------|
| Client OAuth login | **Yes** |
| Web OAuth login | **Yes** |
| Enforce HTTPS | **Yes** |
| Embedded browser OAuth login | **Yes** |
| **Login with JavaScript SDK** | **Yes** (required) |

### Valid OAuth Redirect URIs

```
https://growvisi.com/
https://www.growvisi.com/
http://localhost:3000/
http://127.0.0.1:3000/
```

Embedded Signup uses **FB.login()** from the JS SDK (no custom `/meta/oauth/callback` page).

### Allowed Domains for the JavaScript SDK (no `https://`)

```
growvisi.com
www.growvisi.com
localhost
```

Click **Save changes**.

---

## 2. Embedded Signup configuration

Facebook Login for Business → **Configurations** → WhatsApp Embedded Signup template.

Copy **Configuration ID** → Vercel **API** env:

- `META_EMBEDDED_SIGNUP_CONFIG_ID`
- `META_APP_ID` (e.g. `1544563287381072`)
- `META_APP_SECRET`

Redeploy **API** after changing.

---

## 3. WhatsApp webhook (API domain)

Meta → WhatsApp → Configuration:

- Callback: `https://api.growvisi.com/api/v1/webhooks/whatsapp`
- Verify token: same as `WHATSAPP_VERIFY_TOKEN` on API

---

## 4. Vercel env checklist

### API (`revenue-os-api`)

```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_EMBEDDED_SIGNUP_CONFIG_ID=your_config_id
WEBHOOK_PUBLIC_URL=https://api.growvisi.com
NEXT_PUBLIC_APP_URL=https://www.growvisi.com
CORS_ORIGINS=https://growvisi.com,https://www.growvisi.com
```

### Web (`revenue-os-web`)

```env
NEXT_PUBLIC_APP_URL=https://www.growvisi.com
NEXT_PUBLIC_API_URL=https://api.growvisi.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.growvisi.com
```

Redeploy **web** after `NEXT_PUBLIC_*` changes.

---

## 5. Browser checklist

- Allow popups for `growvisi.com` / `www.growvisi.com`
- Use **Chrome** with third-party cookies allowed for Facebook (or complete login in the popup)
- Hard refresh (Ctrl+Shift+R) after deploy

---

## 6. Code flow (repo)

- Loads Facebook JS SDK on the Settings page
- Calls `FB.login({ config_id, response_type: 'code', extras: { featureType: 'whatsapp_business_app_onboarding' } })` — same as Chatwoot/Twilio
- Waits for auth `code` **and** `WA_EMBEDDED_SIGNUP` postMessage (`waba_id`, `phone_number_id`) before saving
- Next.js sets `Cross-Origin-Opener-Policy: same-origin-allow-popups` for the popup

## 7. "Feature Unavailable" in popup

Meta shows this when **Facebook Login is not available** for app `1694805491426991` (or your app ID):

1. **Development mode** — the Facebook account logging in must be **Administrator** or **Developer** on the app (App roles → Roles).
2. **Facebook Login for Business** product must be added — not only generic "Facebook Login".
3. Complete **Data Use Checkup** if Meta shows it on the app dashboard.
4. Configuration must be login variation **WhatsApp Embedded Signup** (Configurations → copy `META_EMBEDDED_SIGNUP_CONFIG_ID`).

---

## Still failing?

1. Confirm API: `GET https://api.growvisi.com/api/v1/whatsapp-accounts/embedded-signup/config` (with auth) returns `"enabled": true` and non-empty `appId`.
2. Meta → App roles → your Facebook user is **Administrator** or **Developer**.
3. Complete **Business verification** if partner sharing failed earlier.
