import { test, expect, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

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

async function visitDashboardPath(page: Page, path: string) {
  await ensureOnboardingBypassed(page);
  await page.goto(path, { waitUntil: "domcontentloaded" });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!page.url().includes("/onboarding")) break;
    await dismissOnboardingIfVisible(page);
    await ensureOnboardingBypassed(page);
    await page.goto(path, { waitUntil: "domcontentloaded" });
  }

  await expect(page).toHaveURL(new RegExp(path.replace(/\//g, "\\/")), { timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/onboarding/);
}

test.describe("Growvisi public smoke", () => {
  test("marketing home loads", async ({ page }) => {
    await page.goto("/");
    await acceptCookiesIfVisible(page);
    await expect(page.locator("body")).toContainText(/Growvisi|WhatsApp|Pipeline/i);
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Growvisi dashboard E2E", () => {
  test.beforeAll(() => {
    if (!email || !password) {
      throw new Error(
        "E2E_EMAIL and E2E_PASSWORD are required. In CI these are set after db:seed (demo@growvisi.com).",
      );
    }
  });

  test("login → conversations → settings", async ({ page }) => {
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

    await visitDashboardPath(page, "/dashboard/inbox");
    await expect(page.getByRole("heading", { name: /conversations/i })).toBeVisible({
      timeout: 30_000,
    });

    await visitDashboardPath(page, "/dashboard/settings");
    await expect(page.getByRole("heading", { name: /settings/i })).toBeVisible({
      timeout: 30_000,
    });

    await visitDashboardPath(page, "/dashboard/settings?tab=intelligence");
    await expect(page.getByText(/Add docs/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: /business knowledge/i })).toBeVisible();
  });
});
