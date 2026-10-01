import { defineConfig, devices } from "@playwright/test";

const webBaseURL = process.env.E2E_WEB_URL ?? "http://localhost:3001";

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: [["list"]],
  retries: 0,
  testDir: "./e2e",
  timeout: 45_000,
  use: {
    baseURL: webBaseURL,
    trace: "on-first-retry",
  },
  workers: 1,
});
