# Growvisi Partner Install Kit

**Audience:** Meta Tech Providers, WhatsApp BSP partners, and Indian agencies installing Growvisi alongside Meta Business Agent.

**Stack positioning:** Your team replies from **Growvisi Inbox** (human messages). Growvisi AI classifies, tracks pipeline, assigns team, and sends owner digests — it **never auto-replies** customers. Optional **Meta Business Agent** can handle first-line FAQ in WhatsApp.

---

## 1. Prerequisites

| Item | Owner |
|------|--------|
| WhatsApp Business Account (WABA) | Client |
| Meta Business Agent (optional FAQ bot) | Client / Partner |
| Growvisi workspace (trial or paid) | Client |
| Meta Cloud API token or Embedded Signup (TP) | Partner |

---

## 2. Install sequence (45–60 min)

### Step A — Who replies to customers

1. Train client: **human replies** from Growvisi Inbox or WhatsApp directly.
2. Optional: Meta Business Agent for automated first-line FAQ in WhatsApp.
3. Growvisi is the **revenue layer** — classify, handoff, pipeline — not an AI chatbot.

### Step B — Growvisi WhatsApp connect

1. Client opens **Settings → WhatsApp** or `/onboarding`.
2. Paste Meta API Setup token **or** use Embedded Signup (requires Tech Provider approval).
3. Verify **Connection** page shows webhooks + token healthy.

### Step C — First value (< 15 min)

1. Client sends test message to business number.
2. Confirm message appears in **Conversations**.
3. Confirm AI classification + pipeline stage update.
4. Move lead on **Pipeline** board once.

### Step D — Team & alerts

1. Invite sales reps (Settings → Team).
2. Enable **Daily digest** (email and/or WhatsApp) in Automations.
3. Optional: Razorpay payment webhook → Won (Settings → Growth).

---

## 3. Agency mode (Pro)

Agencies on **Pro** can enable **Agency mode** at `/dashboard/agency`:

- Up to **15 client workspaces** per hub
- Agency admins auto-added to each client org
- Per-client health: WhatsApp, pipeline ₹, handoffs, unread

Each client keeps isolated billing and data.

**Per-client health:** Agency dashboard and Partner install kit show connection status (Live / Setup / Token / Not connected), go-live %, and phone number. Use **Connect WhatsApp** or **Continue setup** on a client card to switch workspaces and run onboarding (`/onboarding?from=agency`).

---

## 4. Hindi UI

Users set **Language → Hindi** in Settings → Profile. Dashboard nav and key labels switch to Hindi. Digest WhatsApp body supports Hindi when digest locale is `hi`.

---

## 5. WhatsApp morning digest

For owners who skip email:

1. Automations → Daily digest → Channel: **WhatsApp** or **Both**
2. Enter owner mobile (10-digit India)
3. Optional: Meta-approved template name for reliable outbound
4. Set digest language **English** or **Hindi**

Template body params (if using template): `org name, pipeline ₹, won 24h, handoffs, unread, inbox URL`.

---

## 6. Meta billing boundaries (Solution Partner)

| Item | Who bills |
|------|-----------|
| Growvisi subscription (INR) | Growvisi / Razorpay |
| WhatsApp conversation fees | Meta → client WABA or partner credit line |
| Growvisi reselling Meta credits | **Not in v1** |

Tech Providers: set `META_PARTNER_SOLUTION_ID` on the Growvisi API so Embedded Signup flows attach to your Meta partner solution.

---

## 7. Support boundaries

| Question | Answer |
|----------|--------|
| Who replies to customers? | Your team from Growvisi Inbox (human) · optional Meta Business Agent for FAQ |
| Who moves pipeline? | Growvisi AI + team |
| Can Growvisi send marketing blasts? | Campaigns module (Meta policy applies) |
| Billing currency | INR via Razorpay only |

---

## 8. Links

- Product PRD: `docs/GROWVISI-PRD.md`
- Meta embedded signup: `docs/META-EMBEDDED-SIGNUP.md`
- Tech Provider: `docs/META-TECH-PROVIDER.md`
- In-app kit: `/dashboard/partner`
