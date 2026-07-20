import { test, expect, type Page, type Request } from "@playwright/test";
import fs from "fs";
import path from "path";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

type ApiCall = { url: string; method: string; at: number };

function isConversationApi(url: string): boolean {
  return url.includes("/api/v1/conversations") || url.includes("/conversations/");
}

function classifyConversationUrl(url: string): string {
  if (/\/conversations\/[^/]+\/thread(\?|$)/.test(url)) return "thread_bundle";
  if (/\/conversations\/[^/]+\/inbox-context(\?|$)/.test(url)) return "inbox_context_legacy";
  if (/\/conversations\/(stats|unread)(\/|\?|$)/.test(url)) return "stats";
  if (/\/conversations\/[^/]+(\?|$)/.test(url) && !url.includes("/messages")) return "conversation_legacy";
  if (url.includes("/conversations?")) return "list";
  if (url.includes("/conversations/stats")) return "stats";
  return "other";
}

async function acceptCookiesIfVisible(page: Page) {
  const accept = page.getByRole("button", { name: /^accept$/i });
  if (await accept.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await accept.click();
  }
}

async function ensureOnboardingBypassed(page: Page) {
  await page.evaluate(() => {
    const key = "growvisi-auth";
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    parsed.state = { ...parsed.state, onboardingDismissed: true };
    localStorage.setItem(key, JSON.stringify(parsed));
  });
}

async function dismissOnboardingIfVisible(page: Page) {
  const explore = page.getByRole("button", { name: /explore dashboard/i });
  if (await explore.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await explore.click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await ensureOnboardingBypassed(page);
  }
}

async function loginToDashboard(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in/i }).click();

  const workspaceBtn = page.locator(".auth-workspace-btn").first();
  if (await workspaceBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await workspaceBtn.click();
  }

  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 });
  await acceptCookiesIfVisible(page);
  await dismissOnboardingIfVisible(page);
  await ensureOnboardingBypassed(page);
}

function trackConversationRequests(page: Page): ApiCall[] {
  const calls: ApiCall[] = [];
  page.on("request", (req: Request) => {
    const url = req.url();
    if (!isConversationApi(url)) return;
    calls.push({ url, method: req.method(), at: Date.now() });
  });
  return calls;
}

function summarizeCalls(calls: ApiCall[]) {
  const byKind: Record<string, number> = {};
  for (const c of calls) {
    const kind = classifyConversationUrl(c.url);
    byKind[kind] = (byKind[kind] ?? 0) + 1;
  }
  return byKind;
}

test.describe("Inbox thread bundle certification", () => {
  test.beforeAll(() => {
    if (!email || !password) {
      throw new Error("E2E_EMAIL and E2E_PASSWORD required for inbox certification.");
    }
  });

  test("Phase A: thread open uses bundle endpoint only", async ({ page }) => {
    const allCalls = trackConversationRequests(page);
    await loginToDashboard(page);

    await page.goto("/dashboard/inbox?filter=unassigned", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /conversations/i })).toBeVisible({
      timeout: 30_000,
    });

    const listCallsBefore = [...allCalls];
    const listRows = page.getByTestId("inbox-conversation-row");
    await expect(listRows.first()).toBeVisible({ timeout: 15_000 });
    const rowCount = await listRows.count();

    const report: Record<string, unknown> = {
      certified_at: new Date().toISOString(),
      phase: "A",
      list_conversation_rows: rowCount,
      list_load_api: summarizeCalls(listCallsBefore),
    };

    if (rowCount === 0) {
      report.skipped_thread_open = "no conversations in seed data";
      writeArtifact(report);
      test.skip();
      return;
    }

    // Cold thread open
    const beforeOpen = allCalls.length;
    await listRows.first().click();
    await page.waitForTimeout(1_500);
    const openCalls = allCalls.slice(beforeOpen);
    const openSummary = summarizeCalls(openCalls);

    report.thread_open_api = openSummary;
    report.legacy_inbox_context_calls = openSummary.inbox_context_legacy ?? 0;
    report.legacy_conversation_calls = openSummary.conversation_legacy ?? 0;
    report.thread_bundle_calls = openSummary.thread_bundle ?? 0;

    expect(openSummary.inbox_context_legacy ?? 0).toBe(0);
    expect(openSummary.conversation_legacy ?? 0).toBe(0);
    expect(openSummary.thread_bundle ?? 0).toBeGreaterThanOrEqual(1);
    expect(openSummary.thread_bundle ?? 0).toBeLessThanOrEqual(2);

    // Warm switch back (if 2+ rows)
    if (rowCount >= 2) {
      const beforeSwitch = allCalls.length;
      await listRows.nth(1).click();
      await page.waitForTimeout(800);
      const switchCalls = allCalls.slice(beforeSwitch);
      report.switch_thread_api = summarizeCalls(switchCalls);

      const beforeBack = allCalls.length;
      await listRows.first().click();
      await page.waitForTimeout(800);
      const backCalls = allCalls.slice(beforeBack);
      report.warm_switch_back_api = summarizeCalls(backCalls);
      // Warm cache: prefer 0 thread fetches (30s staleTime)
      report.warm_switch_back_thread_fetches = backCalls.filter((c) =>
        classifyConversationUrl(c.url) === "thread_bundle",
      ).length;
    }

    report.verdict = "PASS";
    writeArtifact(report);
  });

  test("Phase G: rapid thread switch without errors", async ({ page }) => {
    await loginToDashboard(page);
    await page.goto("/dashboard/inbox?filter=unassigned", { waitUntil: "domcontentloaded" });
    const listRows = page.getByTestId("inbox-conversation-row");
    await expect(listRows.first()).toBeVisible({ timeout: 15_000 });
    const rowCount = await listRows.count();
    if (rowCount < 2) {
      writeArtifact({ phase: "G", skipped: "need 2+ conversations", verdict: "SKIP" });
      test.skip();
      return;
    }

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const switches = Math.min(rowCount, 6);
    for (let i = 0; i < switches; i += 1) {
      await listRows.nth(i % rowCount).click();
      await page.waitForTimeout(150);
    }

    const report = {
      certified_at: new Date().toISOString(),
      phase: "G",
      switches,
      page_errors: errors,
      verdict: errors.length === 0 ? "PASS" : "FAIL",
    };
    writeArtifact(report);
    expect(errors).toHaveLength(0);
  });

  test("Phase H: 404 thread shows error without breaking list", async ({ page }) => {
    await loginToDashboard(page);
    await page.goto("/dashboard/inbox?filter=unassigned", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /conversations/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.goto("/dashboard/inbox?conversation=nonexistent-cert-id-404", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(/could not load this conversation/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /back to list/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /conversations/i })).toBeVisible();

    const report = {
      certified_at: new Date().toISOString(),
      phase: "H",
      url: page.url(),
      list_visible: await page.getByRole("heading", { name: /conversations/i }).isVisible(),
      error_visible: await page.getByText(/could not load this conversation/i).isVisible(),
      verdict: "PASS",
    };
    writeArtifact(report);
    expect(report.list_visible).toBe(true);
    expect(report.error_visible).toBe(true);
  });
});

function writeArtifact(report: Record<string, unknown>) {
  const dir = path.resolve(__dirname, "../../../docs/certification/artifacts/inbox");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `phase-a-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
}
