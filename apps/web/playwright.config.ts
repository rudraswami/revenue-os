import { defineConfig, devices } from "@playwright/test";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");
const isCI = !!process.env.CI;

const baseURL =
  process.env.E2E_BASE_URL ?? (isCI ? "http://localhost:3000" : "http://localhost:3000");

const ciEnv = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://revenue_os:revenue_os_dev@localhost:5432/revenue_os",
  DIRECT_URL:
    process.env.DIRECT_URL ??
    "postgresql://revenue_os:revenue_os_dev@localhost:5432/revenue_os",
  JWT_SECRET: process.env.JWT_SECRET ?? "ci-test-secret-minimum-32-characters-long",
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  NODE_ENV: "production",
  PORT: "4000",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: isCI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: isCI
    ? [
        {
          command: "node dist/main",
          cwd: path.join(repoRoot, "apps/api"),
          url: "http://127.0.0.1:4000/api/v1/health",
          timeout: 120_000,
          reuseExistingServer: false,
          env: ciEnv,
        },
        {
          command: "pnpm start --port 3000",
          cwd: path.join(repoRoot, "apps/web"),
          url: "http://127.0.0.1:3000",
          timeout: 120_000,
          reuseExistingServer: false,
          env: {
            ...ciEnv,
            NEXT_PUBLIC_API_URL: "http://127.0.0.1:4000/api/v1",
          },
        },
      ]
    : process.env.E2E_START_SERVERS === "1"
      ? [
          {
            command: "pnpm dev:api",
            cwd: repoRoot,
            url: "http://127.0.0.1:4000/api/v1/health",
            timeout: 120_000,
            reuseExistingServer: true,
          },
          {
            command: "pnpm dev:web",
            cwd: repoRoot,
            url: "http://127.0.0.1:3000",
            timeout: 120_000,
            reuseExistingServer: true,
            env: {
              NEXT_PUBLIC_API_URL: "http://127.0.0.1:4000/api/v1",
            },
          },
        ]
      : undefined,
});
