# Pipeline latency baseline

Measured baselines for the Growvisi AI classify → compose → reply pipeline. Use before/after comparisons when shipping performance or trust-rail changes.

**Last updated:** 2026-07-19  
**Environment:** Production API (`https://api.growvisi.in`)  
**Test conversation:** `cmrq48t840002lb04e1yd6532` (GrowVisi Solutions · NEGOTIATION stage · 0 KB docs)

---

## How to measure

### HTTP probe (deployed API)

```bash
cd apps/api
API_URL=https://api.growvisi.in node scripts/pipeline-http-probe.mjs probe-batch --runs=1
```

Requires `CRON_SECRET` in `.env.production.local`. Uses `GET /api/v1/internal/cron/latency-probe`.

### Local code against production DB

```bash
cd apps/api
vercel env pull .env.production.local --environment=production
npm run build
node scripts/measure-pipeline-prod.mjs probe-batch --runs=1
```

Requires full env (`OPENAI_API_KEY`, `REDIS_URL`, `JWT_SECRET`, `DATABASE_URL`).

### Historical aggregate (30-day)

```bash
pnpm exec dotenv -e apps/api/.env.production.local -- \
  node apps/api/scripts/prod-latency-validation.js baseline
```

---

## Production snapshot — 2026-07-19

**Probe:** 3 scenarios (Hi, Thanks!, pricing question) · 1 run each  
**Artifact:** `apps/api/scripts/output/baseline-production-2026-07-19.json`

| Metric | p50 | p95 | avg | Notes |
|--------|-----|-----|-----|-------|
| Process wall | 27,714 ms | 27,722 ms | 27,555 ms | Full `classify.process()` |
| Classify LLM | 2,652 ms | 3,100 ms | 2,531 ms | Down from ~4,603 ms pre-P0 |
| Compose LLM | 2,041 ms | 2,138 ms | 1,903 ms | ~1,926 ms pre-P0 |
| Customer E2E | — | — | — | No auto-send on test thread |

| Dimension | Value |
|-----------|-------|
| Execution paths | fast: 2, complex: 1 |
| Blockers (pre-metrics deploy) | Not recorded on `ai_runs.output.metrics` yet |
| Pricing scenario | `complex` path · knowledge gap · draft only |

### Pre-P0 reference (audit)

| Metric | Baseline |
|--------|----------|
| Classify p50 | 4,603 ms |
| Compose p50 | 1,926 ms |
| Customer E2E p50 | 52,446 ms |

### Phase 0 targets (roadmap)

| Metric | Target |
|--------|--------|
| Classify p50 | < 3,500 ms |
| Compose p50 | < 2,500 ms |
| Customer E2E p50 | < 15,000 ms (auto-send threads) |
| False auto-send rate | < 0.5% (post Phase 5 trust rails) |

---

## Observability fields (post-deploy)

After Phase 0 Tasks 2–3 deploy, each classify `ai_run` includes `output.metrics`:

| Field | Purpose |
|-------|---------|
| `executionPath` | fast / standard / complex / human |
| `replyMode` | skip / draft / send |
| `blockers` | Policy blocker codes |
| `groundingPercent` | Top KB hit similarity (0–100) |
| `knowledgeGap` | Pricing/policy without docs |
| `stageChanged` | CRM stage advanced this turn |
| `autoEligible` | Would send if policy allows |

Re-run `probe-batch` after deploy to populate blocker distribution and reply modes.

---

## Test thread caveats

1. **NEGOTIATION stage** — automation policy drafts more aggressively than NEW leads.
2. **0 knowledge docs** — pricing probes always hit knowledge gap.
3. **Velocity rail** — wait ≥2.5s between probes (3 AI sends / 2 min).
4. **Use a dedicated probe conversation** for greeting auto-send E2E measurement.

---

## Re-baseline checklist

- [ ] Deploy Phase 0 code (stageChanged, pipeline metrics)
- [ ] Run `probe-batch` on clean thread
- [ ] Record p50 for classify, compose, E2E
- [ ] Record blocker distribution from `output.metrics`
- [ ] Update this doc and `scripts/output/baseline-production-*.json`
