# Growvisi — How the product should look

Companion to [GROWVISI-PRD.md](../../../docs/GROWVISI-PRD.md). Use when designing screens or reviewing UI PRs.

---

## Brand & feel

| Attribute | Guideline |
|-----------|-----------|
| Tone | Professional, calm, revenue-focused — not playful chatbot |
| Colors | Lavender surfaces (`#f8f9ff`), accent green (`#006c49` / mint bento cards) |
| Density | Information-rich but not CRM-cluttered; cards + clear hierarchy |
| Motion | Subtle Framer stagger on panels; no distracting animations |
| India | ₹ currency, en-IN numbers, Razorpay trust copy |

---

## Marketing site (growvisi.in)

**Job:** Convert WhatsApp-heavy SMBs to trial.

```
[Nav: Home · Pricing · FAQ · Login]

Hero: "WhatsApp conversations in. Pipeline ₹ out."
      AI classifies → human reply from Inbox when needed
      [Start 14-day trial]

Social proof → Product screenshots (inbox, pipeline, timeline)
How it works: Connect → Classify → Pipeline → Close
Pricing grid (shared with app via PricingPlansGrid)
FAQ + honest reply model (human Inbox, optional Meta BA, no AI auto-send)
Footer: legal links
```

**Rule:** Marketing may show dashboard screenshots; claims must match shipped product.

---

## App shell (authenticated)

```
┌─────────────────────────────────────────────────────────────┐
│ [Sidebar 280px]  │  [Main — scrolls]                        │
│ Logo             │  [Trial banner if needed]                │
│ Workspace card   │  [WhatsApp setup banner if disconnected] │
│ ─ Overview       │                                          │
│   Home           │  PageHeader + content                    │
│ ─ Engage         │                                          │
│   Conversations* │                                          │
│   Pipeline       │                                          │
│ ─ Intelligence   │                                          │
│   Analytics      │                                          │
│   Intelligence   │                                          │
│   Insights       │                                          │
│ ─ Automate       │                                          │
│   Automations    │                                          │
│ ─────────────    │                                          │
│ [User menu ▾]    │                                          │
│  Settings        │                                          │
│  WhatsApp        │                                          │
│  Pricing         │                                          │
│  Logout          │                                          │
└─────────────────────────────────────────────────────────────┘
* unread badge on Conversations
```

---

## Key screens

### Home (`/dashboard`)

- Getting started checklist (WhatsApp, first message)
- Metric cards: conversations, leads, hot leads
- No Meta legal essay (contextual elsewhere)

### Conversations (`/dashboard/inbox`)

```
[List 320px] | [Thread flex] | [Timeline 288px — desktop]
```

- Thread: message bubbles (inbound white, outbound WhatsApp green tint)
- Header: contact, score badge, stage pill, assign dropdown, AI classify toggle
- Composer: Meta notice (compact) + optional draft suggestion + send (human takeover)
- Timeline: stage changes, AI classify, automation events

### Pipeline (`/dashboard/pipeline`)

- Metric row: total, won, hot
- Horizontal Kanban columns with drag-drop (desktop) / stage dropdown (mobile)
- Cards: avatar, name, hot badge, score bar, deal value, open chat link

### Automations

- Info card: welcome = Meta (no toggle)
- Toggle cards: follow-up email, auto stage, hot lead alert
- Banner explaining what runs server-side vs in WhatsApp

### Settings

Sections: Workspace (team) → Billing → Business context → Quick replies → WhatsApp → Account (profile) → Developer (API keys Pro)

### Pricing (`/dashboard/pricing`)

- Current plan + trial status
- Same grid as marketing, with upgrade buttons → Razorpay checkout

---

## States every screen needs

| State | Treatment |
|-------|-----------|
| Loading | Skeleton matching layout (not spinners everywhere) |
| Empty | `EmptyState` with one clear CTA (connect WhatsApp / open inbox) |
| Error | `QueryErrorState` with retry |
| Trial expired | Red banner → pricing; API 402 handled gracefully |
| AI off | Amber capability banner on relevant pages |

---

## What "full product" looks like (visual delta from MVP)

Same shell and IA. Additions are **depth not redesign**:

- Embedded Signup button in WhatsApp settings (vs paste-token only)
- Richer analytics charts + revenue line from `valueCents`
- Knowledge docs surfaced in suggest-reply quality (no new page required)
- API keys section visible on Pro
- Optional insights cards with recommended actions

**Do not** add: second sidebar, CRM object tabs (Accounts, Deals module), notification bell, email inbox icon.
