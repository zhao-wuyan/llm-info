import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const route of ["/models", "/providers", "/sources", "/compare"]) {
  test(`has no serious accessibility violations: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const result = await new AxeBuilder({ page }).analyze();
    const blocking = result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
  });
}

test("model comparison dialog has no serious accessibility violations", async ({ page }) => {
  await page.goto("/models/moonshotai/kimi-k2.6");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "比较供应商" }).click();
  const result = await new AxeBuilder({ page }).include("dialog").analyze();
  const blocking = result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});
