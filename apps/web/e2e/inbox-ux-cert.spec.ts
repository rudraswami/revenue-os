import { test, expect } from "@playwright/test";
import {
  loginToDashboard,
  modKey,
  openInboxUnassigned,
  requireE2ECredentials,
  skipIfFewerThanRows,
  writeInboxArtifact,
} from "./helpers/inbox-cert";

test.describe("Inbox UX certification (P1)", () => {
  test.beforeAll(() => {
    requireE2ECredentials();
  });

  test("P1 keyboard: j opens first conversation, Esc returns to list", async ({ page }) => {
    await loginToDashboard(page);
    await openInboxUnassigned(page);
    const gate = await skipIfFewerThanRows(page, 1, "ux-keyboard");
    if (gate.skip) {
      test.skip();
      return;
    }

    await page.keyboard.press("j");
    await expect(page).toHaveURL(/[?&]c=/, { timeout: 10_000 });

    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/[?&]c=/, { timeout: 10_000 });

    writeInboxArtifact({
      certified_at: new Date().toISOString(),
      phase: "ux-keyboard",
      verdict: "PASS",
    });
  });

  test("P1 command palette: opens with shortcut and selects via Enter", async ({ page }) => {
    await loginToDashboard(page);
    await openInboxUnassigned(page);
    const gate = await skipIfFewerThanRows(page, 1, "ux-cmdk");
    if (gate.skip) {
      test.skip();
      return;
    }

    await page.keyboard.press(`${modKey()}+k`);
    const input = page.getByPlaceholder(/jump to conversation/i);
    await expect(input).toBeVisible({ timeout: 5_000 });

    await input.press("ArrowDown");
    await input.press("Enter");

    await expect(page).toHaveURL(/[?&]c=/, { timeout: 10_000 });

    writeInboxArtifact({
      certified_at: new Date().toISOString(),
      phase: "ux-cmdk",
      verdict: "PASS",
    });
  });

  test("P1 shortcuts overlay: ? opens help dialog", async ({ page }) => {
    await loginToDashboard(page);
    await openInboxUnassigned(page);

    await page.keyboard.press("?");
    await expect(page.getByRole("heading", { name: /keyboard shortcuts/i })).toBeVisible({
      timeout: 5_000,
    });
    await page.keyboard.press("Escape");

    writeInboxArtifact({
      certified_at: new Date().toISOString(),
      phase: "ux-shortcuts",
      verdict: "PASS",
    });
  });

  test("P1 URL: ?c= deep link opens thread", async ({ page }) => {
    await loginToDashboard(page);
    await openInboxUnassigned(page);
    const gate = await skipIfFewerThanRows(page, 1, "ux-url");
    if (gate.skip) {
      test.skip();
      return;
    }

    const firstRow = page.getByTestId("inbox-conversation-row").first();
    await firstRow.click();
    await expect(page).toHaveURL(/[?&]c=/, { timeout: 10_000 });
    const url = new URL(page.url());
    const conversationId = url.searchParams.get("c");
    expect(conversationId).toBeTruthy();

    await page.goto("/dashboard/inbox", { waitUntil: "domcontentloaded" });
    await page.goto(`/dashboard/inbox?c=${conversationId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByPlaceholder(/write your whatsapp reply/i)).toBeVisible({
      timeout: 15_000,
    });

    writeInboxArtifact({
      certified_at: new Date().toISOString(),
      phase: "ux-url",
      conversation_id: conversationId,
      verdict: "PASS",
    });
  });

  test("P1 search: filter list and open matching thread", async ({ page }) => {
    await loginToDashboard(page);
    await openInboxUnassigned(page);
    const gate = await skipIfFewerThanRows(page, 1, "ux-search");
    if (gate.skip) {
      test.skip();
      return;
    }

    const firstName = await page
      .getByTestId("inbox-conversation-row")
      .first()
      .locator("p")
      .first()
      .innerText();

    const query = firstName.trim().slice(0, 4);
    if (query.length < 2) {
      writeInboxArtifact({ phase: "ux-search", skipped: "name too short", verdict: "SKIP" });
      test.skip();
      return;
    }

    await page.getByPlaceholder(/search/i).fill(query);
    await page.waitForTimeout(400);
    await page.getByTestId("inbox-conversation-row").first().click();
    await expect(page).toHaveURL(/[?&]c=/, { timeout: 10_000 });

    writeInboxArtifact({
      certified_at: new Date().toISOString(),
      phase: "ux-search",
      query,
      verdict: "PASS",
    });
  });

  test("P1 internal notes: activity panel shows team notes", async ({ page }) => {
    await loginToDashboard(page);
    await openInboxUnassigned(page);
    const gate = await skipIfFewerThanRows(page, 1, "ux-notes");
    if (gate.skip) {
      test.skip();
      return;
    }

    await page.getByTestId("inbox-conversation-row").first().click();
    await expect(page).toHaveURL(/[?&]c=/, { timeout: 10_000 });

    const expand = page.getByRole("button", { name: /expand activity/i });
    if (await expand.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await expand.click();
    }

    await expect(page.getByText(/team notes/i)).toBeVisible({ timeout: 10_000 });

    writeInboxArtifact({
      certified_at: new Date().toISOString(),
      phase: "ux-notes",
      verdict: "PASS",
    });
  });
});
