import { defineConfig, devices } from "@playwright/test";

const evidenceRoot = process.env.IMPECCABLE_EVIDENCE_DIR ?? ".workflow/sessions/maestro-20260718-235735/runs/20260719-001-maestro-impeccable/evidence";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: `${evidenceRoot}/playwright-results`,
  reporter: [["list"], ["html", { outputFolder: `${evidenceRoot}/playwright-report`, open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1024 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
