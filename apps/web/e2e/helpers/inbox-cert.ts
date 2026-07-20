import fs from "fs";
import path from "path";
import { expect, type Page, type Request } from "@playwright/test";

export const E2E_EMAIL = process.env.E2E_EMAIL;
export const E2E_PASSWORD = process.env.E2E_PASSWORD;

export type ApiCall = { url: string; method: string; at: number };

export function modKey(): "Meta" | "Control" {
  return process.platform === "darwin" ? "Meta" : "Control";
}

export function requireE2ECredentials() {
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    throw new Error("E2E_EMAIL and E2E_PASSWORD required for inbox certification.");
  }
}

export function isConversationApi(url: string): boolean {
  return url.includes("/api/v1/conversations") || url.includes("/conversations/");
}

export function classifyConversationUrl(url: string): string {
  if (/\/conversations\/[^/]+\/thread(\?|$)/.test(url)) return "thread_bundle";
  if (/\/conversations\/[^/]+\/inbox-context(\?|$)/.test(url)) return "inbox_context_legacy";
  if (/\/conversations\/(stats|unread)(\/|\?|$)/.test(url)) return "stats";
  if (/\/conversations\/[^/]+(\?|$)/.test(url) && !url.includes("/messages")) {
    return "conversation_legacy";
  }
  if (url.includes("/conversations?")) return "list";
  if (url.includes("/conversations/stats")) return "stats";
  return "other";
}

export function summarizeCalls(calls: ApiCall[]) {
  const byKind: Record<string, number> = {};
  for (const c of calls) {
    const kind = classifyConversationUrl(c.url);
    byKind[kind] = (byKind[kind] ?? 0) + 1;
  }
  return byKind;
}

export function writeInboxArtifact(report: Record<string, unknown>) {
  const dir = path.resolve(__dirname, "../../../docs/certification/artifacts/inbox");
  fs.mkdirSync(dir, { recursive: true });
  const phase = String(report.phase ?? "misc").toLowerCase();
  const file = path.join(dir, `phase-${phase}-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}

export async function acceptCookiesIfVisible(page: Page) {
  const accept = page.getByRole("button", { name: /^accept$/i });
  if (await accept.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await accept.click();
  }
}

export async function ensureOnboardingBypassed(page: Page) {
  await page.evaluate(() => {
    const key = "growvisi-auth";
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    parsed.state = { ...parsed.state, onboardingDismissed: true };
    localStorage.setItem(key, JSON.stringify(parsed));
  });
}

export async function dismissOnboardingIfVisible(page: Page) {
  const explore = page.getByRole("button", { name: /explore dashboard/i });
  if (await explore.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await explore.click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await ensureOnboardingBypassed(page);
  }
}

export async function loginToDashboard(page: Page) {
  requireE2ECredentials();
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(E2E_EMAIL!);
  await page.getByLabel(/password/i).fill(E2E_PASSWORD!);
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

export async function openInboxUnassigned(page: Page) {
  await page.goto("/dashboard/inbox?filter=unassigned", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /conversations/i })).toBeVisible({
    timeout: 30_000,
  });
}

export function trackConversationRequests(page: Page): ApiCall[] {
  const calls: ApiCall[] = [];
  page.on("request", (req: Request) => {
    const url = req.url();
    if (!isConversationApi(url)) return;
    calls.push({ url, method: req.method(), at: Date.now() });
  });
  return calls;
}

export async function getInboxRowCount(page: Page) {
  const listRows = page.getByTestId("inbox-conversation-row");
  await expect(listRows.first()).toBeVisible({ timeout: 15_000 });
  return listRows.count();
}

export async function skipIfFewerThanRows(page: Page, min: number, phase: string) {
  const rowCount = await getInboxRowCount(page);
  if (rowCount < min) {
    writeInboxArtifact({
      phase,
      skipped: `need ${min}+ conversations, have ${rowCount}`,
      verdict: "SKIP",
    });
    return { skip: true as const, rowCount };
  }
  return { skip: false as const, rowCount };
}
