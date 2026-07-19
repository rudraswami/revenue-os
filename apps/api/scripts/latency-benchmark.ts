/**
 * Latency model benchmark — compares old vs new pipeline architecture.
 * Run: pnpm exec ts-node apps/api/scripts/latency-benchmark.ts
 */
import { FastReplyService } from "../src/modules/intelligence/fast-reply.service";
import { PipelineSpans } from "../src/modules/intelligence/pipeline-spans";
import { ExecutionRouterService } from "../src/modules/intelligence/execution-router.service";

const OLD_PIPELINE_MS = {
  defer_queue: 10_000,
  classify_llm: 3_000,
  post_classify_db: 19_000,
  email_before_reply: 5_000,
  compose_rebuild_rag: 3_000,
  compose_llm: 2_000,
  whatsapp_send: 300,
};

const NEW_FAST_PATH_MS = {
  context_build: 80,
  fast_template: 1,
  whatsapp_send: 300,
  background_classify: 3_000,
};

const NEW_STANDARD_MS = {
  context_build: 80,
  rag_once: 200,
  classify_llm: 3_000,
  reply_send_compose: 2_200,
  whatsapp_send: 300,
  deferred_crm: 500,
};

function sum(obj: Record<string, number>) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

const fast = new FastReplyService();
const router = new ExecutionRouterService(fast);

const spans = new PipelineSpans();
spans.mark("fast");
const greeting = fast.compose("Hi", "GrowVisi Solutions", {
  organizationId: "o",
  conversationId: "c",
  leadId: "l",
  lead: {
    id: "l",
    stage: "NEW",
    score: 10,
    displayName: null,
    phone: "91",
    profile: {},
    aiEnabled: true,
  },
  conversation: {
    id: "c",
    aiEnabled: true,
    metadata: {},
    contactName: null,
    lastInboundAt: new Date(),
  },
  messages: [],
  transcript: "Customer: Hi",
  lastInbound: "Hi",
  ragQuery: "Hi",
  observedMemory: [],
});
spans.measure("fast_compose_ms", "fast");

const route = router.routePreClassify({
  organizationId: "o",
  conversationId: "c",
  leadId: "l",
  lead: {
    id: "l",
    stage: "NEW",
    score: 10,
    displayName: null,
    phone: "91",
    profile: {},
    aiEnabled: true,
  },
  conversation: {
    id: "c",
    aiEnabled: true,
    metadata: {},
    contactName: null,
    lastInboundAt: new Date(),
  },
  messages: [],
  transcript: "Customer: Hi",
  lastInbound: "Hi",
  ragQuery: "Hi",
  observedMemory: [],
});

console.log("=== Growvisi AI Pipeline Latency Model ===\n");
console.log("Greeting fast-path template:", greeting?.slice(0, 60) + "...");
console.log("Router path for 'Hi':", route.path);
console.log("Measured fast template compose:", spans.spans.fast_compose_ms, "ms\n");

console.log("OLD architecture (production measured, Jul 2026):");
console.log("  Customer E2E (Hi/Thanks):     ~50,000–62,000 ms");
console.log("  LLM only (classify+compose):  ~6,000 ms");
console.log("  Modeled components sum:       ", sum(OLD_PIPELINE_MS), "ms\n");

console.log("NEW architecture (modeled customer-visible path):");
console.log("  Fast path (Hi/Thanks):        ", sum(NEW_FAST_PATH_MS), "ms customer-visible");
console.log("    (classify runs in background, not blocking send)");
console.log("  Standard path (pricing etc):  ", sum(NEW_STANDARD_MS), "ms");
console.log("    (email + CRM deferred; single RAG pass; reply.send first)\n");

console.log("Expected improvement:");
const oldE2e = 50_214;
const newFast = sum(NEW_FAST_PATH_MS);
const newStandard = sum(NEW_STANDARD_MS);
console.log(`  Greeting p50: ${oldE2e}ms → ~${newFast}ms (${Math.round((1 - newFast / oldE2e) * 100)}% faster)`);
console.log(`  Standard p50: ${oldE2e}ms → ~${newStandard}ms (${Math.round((1 - newStandard / oldE2e) * 100)}% faster)`);
