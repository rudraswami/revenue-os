import { test, expect } from "@playwright/test";
import {
  classifyConversationUrl,
  getInboxRowCount,
  loginToDashboard,
  openInboxUnassigned,
  requireE2ECredentials,
  summarizeCalls,
  trackConversationRequests,
  writeInboxArtifact,
} from "./helpers/inbox-cert";

test.describe("Inbox thread bundle certification", () => {
  test.beforeAll(() => {
    requireE2ECredentials();
  });

  test("Phase A: thread open uses bundle endpoint only", async ({ page }) => {
    const allCalls = trackConversationRequests(page);
    await loginToDashboard(page);
    await openInboxUnassigned(page);

    const listCallsBefore = [...allCalls];
    const rowCount = await getInboxRowCount(page);

    const report: Record<string, unknown> = {
      certified_at: new Date().toISOString(),
      phase: "A",
      list_conversation_rows: rowCount,
      list_load_api: summarizeCalls(listCallsBefore),
    };

    if (rowCount === 0) {
      report.skipped_thread_open = "no conversations in seed data";
      writeInboxArtifact(report);
      test.skip();
      return;
    }

    const beforeOpen = allCalls.length;
    await page.getByTestId("inbox-conversation-row").first().click();
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

    if (rowCount >= 2) {
      const listRows = page.getByTestId("inbox-conversation-row");
      const beforeSwitch = allCalls.length;
      await listRows.nth(1).click();
      await page.waitForTimeout(800);
      report.switch_thread_api = summarizeCalls(allCalls.slice(beforeSwitch));

      const beforeBack = allCalls.length;
      await listRows.first().click();
      await page.waitForTimeout(800);
      const backCalls = allCalls.slice(beforeBack);
      report.warm_switch_back_api = summarizeCalls(backCalls);
      report.warm_switch_back_thread_fetches = backCalls.filter(
        (c) => classifyConversationUrl(c.url) === "thread_bundle",
      ).length;
      expect(report.warm_switch_back_thread_fetches).toBe(0);
    }

    report.verdict = "PASS";
    writeInboxArtifact(report);
  });

  test("Phase G: rapid thread switch without errors", async ({ page }) => {
    await loginToDashboard(page);
    await openInboxUnassigned(page);
    const rowCount = await getInboxRowCount(page);
    if (rowCount < 2) {
      writeInboxArtifact({ phase: "G", skipped: "need 2+ conversations", verdict: "SKIP" });
      test.skip();
      return;
    }

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const listRows = page.getByTestId("inbox-conversation-row");
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
    writeInboxArtifact(report);
    expect(errors).toHaveLength(0);
  });

  test("Phase H: 404 thread shows error without breaking list", async ({ page }) => {
    await loginToDashboard(page);
    await openInboxUnassigned(page);

    await page.goto("/dashboard/inbox?conversation=nonexistent-cert-id-404", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(/could not load this conversation/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /back to list/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /conversations/i })).toBeVisible();

    await page.getByRole("button", { name: /back to list/i }).click();
    await expect(page).not.toHaveURL(/nonexistent-cert-id-404/);
    await expect(page.getByRole("heading", { name: /conversations/i })).toBeVisible();

    const report = {
      certified_at: new Date().toISOString(),
      phase: "H",
      url: page.url(),
      list_visible: await page.getByRole("heading", { name: /conversations/i }).isVisible(),
      error_visible: true,
      back_to_list_works: true,
      verdict: "PASS",
    };
    writeInboxArtifact(report);
  });
});
