# Meta policy alignment — Growvisi

Growvisi is a **WhatsApp conversation intelligence** product. We complement **Meta Business Agent** (in-chat AI replies), we do not compete with or misrepresent Meta’s messaging products.

---

## Our declared use case (App Review & Tech Provider)

| We do | We do not |
|-------|-----------|
| Ingest customer messages via **WhatsApp Cloud API webhooks** | Send bulk / spam messages |
| Classify intent, score leads, update **pipeline stages** | Train public models on customer data without consent |
| Show **analytics, timeline, insights** for the business | Impersonate Meta or claim to be Meta’s official AI |
| Optional **human takeover** reply from dashboard | Require Facebook Login for Growvisi account auth |
| Connect WABA via **Embedded Signup** or **API Setup** | Scrape data outside approved Meta APIs |

**Permissions we request:**

- `whatsapp_business_management` — connect customer WABA (with their consent via OAuth)
- `whatsapp_business_messaging` — receive messages (webhooks) and optional human-agent replies within the 24-hour window
- `public_profile` — minimal OAuth field during Embedded Signup only

---

## Customer responsibilities (Meta + WhatsApp policies)

Businesses using Growvisi must:

1. Obtain **opt-in** from customers to message them on WhatsApp
2. Honor **WhatsApp Commerce Policy** and **Business Messaging Policy**
3. Provide their own privacy notice to end customers
4. Use **Meta Business Agent** for automated replies inside WhatsApp when desired
5. Use Growvisi for **team visibility, classification, and revenue tracking**

---

## Data handling (summary for Meta Data Use form)

| Item | Answer |
|------|--------|
| Data controller | Customer (business); Growvisi processes on their behalf |
| Processors | Vercel, Supabase, Upstash, Resend, OpenAI (classification only when enabled) |
| Purpose | CRM analytics, lead pipeline, conversation classification |
| Retention | Per customer workspace; deletion via `/data-deletion` |
| Sale of data | No |

---

## App Review testing script (intelligence-first)

1. Login at https://www.growvisi.in/login (test account)
2. Settings → Connect via Meta Developer (API Setup) if not pre-connected
3. Send inbound WhatsApp test message from a phone
4. Show **Conversations** — message ingested
5. Show **Pipeline** — lead created / stage updated
6. Show **lead timeline** — AI classification event
7. Show **Analytics** and **Insights**
8. Optional: expand **Human takeover** in Conversations to demo outbound (not primary use case)

---

## App settings (Meta dashboard)

| Field | Value |
|-------|--------|
| Category | **Messaging** |
| Tech Provider type | **Independent Tech Provider** |
| Privacy | https://www.growvisi.in/privacy |
| Terms | https://www.growvisi.in/terms |
| Data deletion | https://www.growvisi.in/data-deletion |

---

## Links

- [WhatsApp Business Messaging Policy](https://www.whatsapp.com/legal/business-policy)
- [Meta Tech Provider docs](https://developers.facebook.com/docs/whatsapp/solution-providers/get-started-for-tech-providers)
- [Product narrative](./GROWVISI-PRODUCT-NARRATIVE.md)
