# Meta Facebook Login — growvisi.in setup

Use this when **Continue with Facebook** shows **Feature Unavailable**, **JSSDK unknown error**, or login fails.

**App ID:** `1694805491426991`  
**Config ID (env):** `1529235155408813` (**ES Config** — Login variation must be **WhatsApp Embedded Signup**, not General) → `META_EMBEDDED_SIGNUP_CONFIG_ID`

## Vercel env corruption (Windows — fixed)

If Embedded Signup fails after config looks correct, check Vercel env values were not saved with a literal `\r\n` suffix (Windows `vercel env add` quirk). Symptom: Graph API returns **Invalid OAuth access token signature** and `FB.login` gets app id `1694805491426991\r\n`.

**Fix:** Run `scripts/fix-vercel-meta-env-clean.ps1` from repo root, redeploy API + Web. Growvisi also sanitizes env in `sanitizeEnvValue()` and in `facebook-sdk.ts`.

---

## App Review vs "Feature Unavailable" (read this first)

These are **three different things**. Meta documentation often mentions them in the same guides, which causes confusion.

| What you see | What it actually means | Fixed by App Review? |
|--------------|------------------------|----------------------|
| Growvisi button disabled — **"After App Review"** | `WHATSAPP_EMBEDDED_SIGNUP_LIVE=false` on API — rare; embedded signup is **on by default** | Set env to `true` or remove `false` |
| Meta popup — **Feature Unavailable** | Meta has **not enabled Facebook Login** for this app + Facebook account yet | **No** — Meta dashboard config (roles, checkup, domains) |
| Meta popup — **only available for BSPs or TPs** | Tech Provider / BSP program not approved | **Partly** — needs Meta partner onboarding |
| App Review **Advanced** permissions | `whatsapp_business_messaging` / `management` for **all customers** when app is Live | **Yes** — submit screencasts |

**You can complete App Review using the token-paste flow** (`Connect with Meta API Setup`) — that does **not** require Embedded Signup or Facebook Login to work.

Embedded Signup (`FB.login` + `config_id`) is enabled by default in Growvisi. Set `WHATSAPP_EMBEDDED_SIGNUP_LIVE=false` on the API only if you need to hide one-click connect.

---

## Advanced Settings — do you need a callback URL?

**No callback URL field on App settings → Advanced.** That page is for domains, API version, and security — not OAuth redirects.

| Meta location | What to enter |
|---------------|----------------|
| **Advanced → Domain Manager** | `growvisi.in`, `www.growvisi.in` (not a callback path) |
| **Facebook Login for Business → Settings → Valid OAuth Redirect URIs** | `https://www.growvisi.in/` and `https://growvisi.in/` (site root **with trailing slash** — not `/meta/oauth/callback`) |
| **Facebook Login for Business → Allowed Domains** | `growvisi.in`, `www.growvisi.in` |
| **WhatsApp → Configuration → Callback URL** | `https://api.growvisi.in/api/v1/webhooks/whatsapp` (webhooks only — separate from Embedded Signup login) |

Embedded Signup uses **`FB.login()` in a popup** — Meta returns the auth code to the SDK; Growvisi does **not** use a custom browser redirect page.

---

## Fix "Feature Unavailable" (do in this order)

Meta shows **Feature Unavailable — Facebook Login is currently unavailable for this app** when the app is **not allowed to run Facebook Login yet**. This is **100% Meta dashboard configuration**, not a Growvisi code bug.

### Step 1 — Add yourself as app tester (most common fix)

While the app is in **Development** mode, only people listed on the app can log in.

1. Open [developers.facebook.com/apps/1694805491426991/roles/roles](https://developers.facebook.com/apps/1694805491426991/roles/roles)
2. Click **Add people** → choose **Administrator** or **Developer**
3. Enter the **exact Facebook account** you use in the popup (the one that shows the error)
4. They must **accept the invite** (email / notifications)
5. Log out of Facebook in the browser, log back in, try **Continue with Facebook** again

### Step 2 — Complete Required actions

1. Open [developers.facebook.com/apps/1694805491426991](https://developers.facebook.com/apps/1694805491426991)
2. Click **Required actions** (red badge in top bar if present)
3. Finish **Data Use Checkup** and anything else listed — until the list is empty

### Step 3 — App Basic settings + Domain Manager

[App settings → Basic](https://developers.facebook.com/apps/1694805491426991/settings/basic/)

| Field | Required |
|-------|----------|
| App icon | Yes |
| Privacy Policy URL | Yes — e.g. `https://www.growvisi.in/privacy` |
| User data deletion | URL or instructions |
| App domains | `growvisi.in` |
| Category | Business |

[App settings → Advanced](https://developers.facebook.com/apps/1694805491426991/settings/advanced/) → **Domain Manager**

| Field | Required |
|-------|----------|
| Domains | Add `growvisi.in` and `www.growvisi.in` (screenshot showing "No domains" here often correlates with login failures) |

Save changes.

### Step 4 — Facebook Login **for Business** (not old "Facebook Login")

1. App dashboard → **Use cases** (or Add products)
2. Find **Facebook Login for Business** → **Set up** (if not already added)
3. Go to **Facebook Login for Business → Settings**

| Setting | Value |
|---------|--------|
| Client OAuth login | **Yes** |
| Web OAuth login | **Yes** |
| Enforce HTTPS | **Yes** |
| Embedded browser OAuth login | **Yes** |
| Use Strict Mode for redirect URIs | **Yes** |
| **Login with JavaScript SDK** | **Yes** |

**Valid OAuth Redirect URIs** (exact match, trailing slash matters):

```
https://growvisi.in/
https://www.growvisi.in/
http://localhost:3000/
http://127.0.0.1:3000/
```

**Allowed Domains for the JavaScript SDK** (no `https://`):

```
growvisi.in
www.growvisi.in
localhost
```

Click **Save changes**.

### Step 5 — Embedded Signup configuration

1. **Facebook Login for Business → Configurations**
2. Open your config (ID should match `1529235155408813` / **ES Config**) or create new from template:
   - Login variation: **WhatsApp Embedded Signup** (not General — General only does Facebook Login and closes the popup)
   - Access token: **System-user** (60-day / never-expire template)
   - Assets: **WhatsApp accounts**
   - Permissions: `whatsapp_business_management` + `whatsapp_business_messaging`
3. Copy **Configuration ID** → Vercel API env `META_EMBEDDED_SIGNUP_CONFIG_ID`
4. Redeploy API

### Step 6 — WhatsApp product

1. **Use cases → WhatsApp** → must be **Set up**
2. **Configuration** → webhook `https://api.growvisi.in/api/v1/webhooks/whatsapp`
3. Subscribe to **messages** field

### Step 7 — When ready for real customers (not just your account)

1. [App Review](https://developers.facebook.com/apps/1694805491426991/app-review/) → **Advanced** access for:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
2. Complete **Tech Provider** onboarding — see [META-TECH-PROVIDER.md](./META-TECH-PROVIDER.md)
3. Switch app to **Live** mode (top of dashboard)

Until Live + App Review, only **app roles** (Step 1) can use Facebook Login.

---

## Vercel env (production)

### API

```env
META_APP_ID=1694805491426991
META_APP_SECRET=<from Meta Basic → Show>
META_EMBEDDED_SIGNUP_CONFIG_ID=1529235155408813
WEBHOOK_PUBLIC_URL=https://api.growvisi.in
NEXT_PUBLIC_APP_URL=https://www.growvisi.in
CORS_ORIGINS=https://growvisi.in,https://www.growvisi.in
WHATSAPP_VERIFY_TOKEN=<your token>
WHATSAPP_API_VERSION=v21.0
```

### Web

```env
NEXT_PUBLIC_APP_URL=https://www.growvisi.in
NEXT_PUBLIC_API_URL=https://api.growvisi.in/api/v1
NEXT_PUBLIC_WS_URL=wss://api.growvisi.in
```

Redeploy **web + API** after changes.

---

## Browser checklist

- Open **https://www.growvisi.in** (not an old `.com` URL)
- Allow popups for `growvisi.in`
- Hard refresh (Ctrl+Shift+R)
- Try Chrome; allow third-party cookies for Facebook during login

---

## Error vs cause

| What you see | Cause | Fix |
|--------------|-------|-----|
| **Feature Unavailable** | App login disabled for this user / pending checkup | Steps 1–4 above |
| **JSSDK unknown error** | Domain not in Allowed Domains | Step 4 Allowed Domains |
| **Only available for BSPs or TPs** | Tech Provider not approved | [META-TECH-PROVIDER.md](./META-TECH-PROVIDER.md) + use API Setup to test |
| Facebook feed after login | Wrong login flow (fixed in code) | Deploy latest web; uses `FB.login` + `featureType` |

---

## Verify Growvisi config

While logged into Growvisi, API should return (with auth cookie):

`GET https://api.growvisi.in/api/v1/whatsapp-accounts/embedded-signup/config`

```json
{
  "enabled": true,
  "appId": "1694805491426991",
  "configId": "1529235155408813",
  "graphApiVersion": "v21.0"
}
```

If `enabled` is false, set `META_APP_ID`, `META_EMBEDDED_SIGNUP_CONFIG_ID`, and `META_APP_SECRET` on API and redeploy.
