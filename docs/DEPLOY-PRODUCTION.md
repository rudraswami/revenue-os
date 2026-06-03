# Deploy Revenue OS to production

Stack: **Supabase** (Postgres) · **Upstash** (Redis) · **Railway/Render** (API) · **Vercel** (Web)

---

## 1. Database (Supabase)

1. Create or use your Supabase project.
2. Run SQL extensions if needed (`vector`).
3. Apply schema:

```powershell
cd C:\Users\DELL\revenue-os
pnpm db:push
pnpm supabase:push
pnpm db:seed
```

4. Rotate DB password if it was ever shared; update `DATABASE_URL` and `DIRECT_URL`.

---

## 2. Redis (Upstash)

1. [console.upstash.com](https://console.upstash.com) → create database.
2. Copy **Redis URL** → `REDIS_URL` (required for WhatsApp inbound queue).

---

## 3. API (Vercel or Railway)

### Vercel (NestJS serverless)

**Project settings:**

| Setting | Value |
|---------|--------|
| Root Directory | `apps/api` |
| Framework Preset | **NestJS** (or auto from `vercel.json`) |
| Output Directory | **Leave empty** — do NOT set `public` |
| Build Command | *(use `apps/api/vercel.json`)* |
| Install Command | *(use `apps/api/vercel.json`)* |

`apps/api/vercel.json` must include `"framework": "nestjs"`.  
If the dashboard has **Output Directory = public**, clear it — that causes `No Output Directory named "public" found`.

### Environment variables

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Supabase pooler (6543) |
| `DIRECT_URL` | Supabase direct (5432) |
| `REDIS_URL` | Upstash rediss URL |
| `JWT_SECRET` | `openssl rand -base64 32` |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `API_PORT` | `4000` |
| `NEXT_PUBLIC_APP_URL` | `https://app.yourdomain.com` |
| `CORS_ORIGINS` | `https://app.yourdomain.com` |
| `WEBHOOK_PUBLIC_URL` | `https://api.yourdomain.com` |
| `WHATSAPP_VERIFY_TOKEN` | random string |
| `WHATSAPP_APP_SECRET` | Meta app secret |
| `META_APP_ID` / `META_APP_SECRET` | Meta developer app |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Embedded Signup config |
| `RESEND_API_KEY` | (password reset emails) |
| `EMAIL_FROM` | `Revenue OS <noreply@yourdomain.com>` |

### Railway

1. New project → **Deploy from GitHub** → repo `revenue-os`.
2. Uses root `Dockerfile` + `railway.toml`.
3. Set all env vars above.
4. Generate domain → set `WEBHOOK_PUBLIC_URL=https://<api-domain>`.

### Health check

`GET https://<api-domain>/api/v1/health`

---

## 4. Web (Vercel)

1. Import repo; set **Root Directory** to `apps/web` (or use `vercel.json` install/build commands).
2. Environment variables:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://<api-domain>/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `wss://<api-domain>` |
| `NEXT_PUBLIC_APP_URL` | `https://app.yourdomain.com` |
| `NEXT_PUBLIC_META_APP_ID` | Meta app id |
| `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` | Config id |

3. Redeploy after API URL is live.

---

## 5. Meta WhatsApp

1. [developers.facebook.com](https://developers.facebook.com) → your app.
2. **Facebook Login for Business** → allowed domains: production app domain.
3. **Webhooks** → callback: `https://<api-domain>/api/v1/webhooks/whatsapp`
4. Subscribe: `messages` (and related fields).
5. See `docs/META-EMBEDDED-SIGNUP.md` for Embedded Signup.

---

## 6. Post-deploy checklist

- [ ] Register → onboarding → Connect WhatsApp
- [ ] Send test WhatsApp → appears in Inbox
- [ ] Reply from Inbox → delivers on phone
- [ ] Sign out / sign in / forgot password email
- [ ] Token refresh: stay logged in > 15 minutes

---

## 7. Demo login (after seed)

- Email: `demo@revenue-os.local`
- Password: `demo123456`

No org slug required.
