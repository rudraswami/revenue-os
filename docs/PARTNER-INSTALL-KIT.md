# Growvisi Partner Install Kit

**Audience:** Meta Tech Providers, WhatsApp agencies, and multi-location operators installing Growvisi for client businesses.

**Stack positioning:** Your team replies from **Growvisi Conversations** (human messages). Growvisi AI classifies, tracks pipeline, assigns team, and sends owner digests — it **never auto-replies** customers. Optional **Meta Business Agent** can handle first-line FAQ in WhatsApp.

**Connect path:** **Meta Embedded Signup only** (App Review approved). Do not paste Meta API Setup tokens as the install path.

---

## 1. Prerequisites

| Item | Owner |
|------|--------|
| WhatsApp Business Account (WABA) | Client |
| Meta Business Agent (optional FAQ bot) | Client / Partner |
| Growvisi Operator (Pro) + Agency hub | Agency |
| Meta Embedded Signup (Tech Provider / approved app) | Partner |

---

## 2. Install sequence (45–60 min)

### Step A — Who replies to customers

1. Train client: **human replies** from Growvisi Conversations or WhatsApp directly.
2. Optional: Meta Business Agent for automated first-line FAQ in WhatsApp.
3. Growvisi is the **revenue layer** — classify, handoff, pipeline — not an AI chatbot.

### Step B — Agency hub + client workspace

1. On Operator plan, open `/dashboard/agency` and **Enable Agency hub**.
2. **Add client** — creates an isolated Growvisi workspace (own trial/billing).
3. Optional: **Invite client owner** from the client card (Owner on the client org).

### Step C — Connect WhatsApp (Embedded Signup)

1. On the client card, click **Connect with Meta** (or **Reconnect with Meta** if connection health fails).
2. Complete Meta Embedded Signup — stay in the Agency hub when using “Connect here”.
3. Verify **Connection** health (`/dashboard/connection` after switch, or go-live % on the card).

### Step D — First value (&lt; 15 min)

1. Client (or you) sends a test WhatsApp **to** the business number from a personal phone.
2. Confirm message in **Conversations**.
3. Confirm AI classification + pipeline stage update.
4. Move a lead on **Pipeline** once.

### Step E — Team & alerts

1. Invite sales reps (Settings → Team) in the client workspace.
2. Enable **Daily digest** (email and/or WhatsApp) in Automations.
3. Optional: Razorpay payment → Won (Settings → Growth) on Growth+.

---

## 3. Agency hub (Operator / Pro)

Agencies on **Operator (Pro)** enable **Agency hub** at `/dashboard/agency`:

- Up to **15 client workspaces** per hub
- Agency admins auto-added to each client org
- Per-client health: Live / Setup / **Reconnect** / Not connected, go-live %, phone, pipeline ₹, handoffs
- **Connect / Reconnect with Meta** via Embedded Signup without pasting tokens
- Rename clients; **Remove from portfolio** to free a slot (client org remains)
- Invite client business owner by email

**Partner install kit** lives at `/dashboard/partner` — open from Agency hub when installing. Not in default SMB left nav; after Agency hub is enabled it can appear under Overview.

---

## 4. Hindi UI

Users set **Language → Hindi** in Settings → Profile. Dashboard nav and Agency/Partner copy switch to Hindi. Digest WhatsApp body supports Hindi when digest locale is `hi`.

---

## 5. WhatsApp morning digest

For owners who skip email:

1. Automations → Daily digest → Channel: **WhatsApp** or **Both**
2. Enter owner mobile (10-digit India)
3. Optional: Meta-approved template name for reliable outbound
4. Set digest language **English** or **Hindi**

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
| Who replies to customers? | Client team from Growvisi Conversations (human) · optional Meta Business Agent for FAQ |
| How do we connect WhatsApp? | **Embedded Signup only** — Reconnect with Meta if session expires |
| Who moves pipeline? | Growvisi AI + team |
| Billing currency | INR via Razorpay only |

---

## 8. Links

- In-app kit: `/dashboard/partner`
- Agency hub: `/dashboard/agency`
- Product PRD: `docs/GROWVISI-PRD.md`
- Meta embedded signup: `docs/META-EMBEDDED-SIGNUP.md`
- Tech Provider: `docs/META-TECH-PROVIDER.md`
