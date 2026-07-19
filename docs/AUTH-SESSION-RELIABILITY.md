# Auth session reliability — production cookie & CORS checklist

Do **not** change JWT lifetimes here. This documents required production configuration so silent refresh works.

## Expected production values (growvisi.in)

| Setting | Expected value | Where |
|---------|----------------|--------|
| `COOKIE_DOMAIN` | `.growvisi.in` | API (Vercel/Railway) env |
| Refresh cookie name | `growvisi_rt` | `auth-cookie.util.ts` |
| `HttpOnly` | `true` | code |
| `Secure` | `true` in production | code (`NODE_ENV=production` or `VERCEL=1`) |
| `SameSite` | `Lax` in production (same-site subdomains www ↔ api) | code |
| Cookie `Path` | `/api/v1/auth` | code — must match refresh/logout routes |
| `CORS` credentials | `true` | `main.ts` |
| Allowed origins | `https://www.growvisi.in`, `https://growvisi.in` (+ patterns in `cors-origins.ts`) | `CORS_ORIGINS` / `NEXT_PUBLIC_APP_URL` |
| Web `credentials` | `include` on all API fetches | `api-client-core.ts` |

## Verify after login (browser DevTools → Network)

1. `POST /api/v1/auth/login` response includes:
   - `Set-Cookie: growvisi_rt=...; Path=/api/v1/auth; HttpOnly; Secure; SameSite=None; Domain=.growvisi.in`
2. Later `POST /api/v1/auth/refresh` request includes:
   - `Cookie: growvisi_rt=...`
3. Response is **200** with new `accessToken` (and new Set-Cookie).

If step 2 has no Cookie header, refresh cannot work and users will appear logged out after access JWT expiry (~15m of API use). Fix env (`COOKIE_DOMAIN` / CORS), not token duration.

## Client reliability rules (P0)

- Session cleared **only** on conclusive auth death: `AUTH_EXPIRED` | `AUTH_REVOKED` | `AUTH_INVALID`
- Network / 5xx / offline / timeouts **never** call `clear()`
- Multi-tab: one refresh lock; access token shared via `BroadcastChannel` + `localStorage`
- Every refresh and logout emits a structured `console.info` JSON line (`auth.refresh` / `auth.logout`)

## Logout reasons

`USER_SIGN_OUT` · `REFRESH_TOKEN_EXPIRED` · `TOKEN_REVOKED` · `TOKEN_INVALID` · `PASSWORD_CHANGED` · `ACCOUNT_DISABLED` · `BOOTSTRAP_AUTH_INVALID`
