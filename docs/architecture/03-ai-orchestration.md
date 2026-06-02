# AI Orchestration Architecture

## Layered Design

```
┌────────────────────────────────────────────────────────────┐
│                  Agent Orchestrator (future)               │
│         Routes tasks to specialized agents                 │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────┐
│                   Prompt Orchestration Layer                 │
│  Templates · Variables · Guardrails · Model routing          │
└────────────────────────────┬───────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   OpenAI     │    │   Claude     │    │  Embeddings  │
│  (primary)   │    │  (fallback)  │    │  (pgvector)  │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Model Routing

| Task | Primary | Fallback |
|------|---------|----------|
| Lead classification | gpt-4o-mini | claude-3-5-haiku |
| Customer reply | gpt-4o | claude-sonnet |
| Insights summary | gpt-4o | claude-sonnet |
| Embeddings | text-embedding-3-small | — |

## Memory System

1. **Short-term**: Last N messages in conversation (DB)
2. **Working memory**: Extracted entities (lead name, product interest) in `LeadProfile`
3. **Long-term**: pgvector chunks from knowledge base + conversation summaries

## RAG Pipeline

1. Ingest documents → chunk → embed → `KnowledgeChunk`
2. On reply: hybrid search (vector + metadata filters by org)
3. Inject retrieved context into prompt orchestrator

## Classification Output Schema

```typescript
{
  stage: LeadStage;
  confidence: number; // 0-1
  intent: string;
  sentiment: "positive" | "neutral" | "negative";
  suggestedActions: string[];
  requiresHuman: boolean;
}
```

## Guardrails

- PII redaction in logs
- Max tokens per org per day (billing meter)
- No financial commitments without human approval flag
- Escalation on low confidence (<0.6) or explicit human request
