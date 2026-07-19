import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const evidenceRoot = path.resolve(
  process.env.IMPECCABLE_EVIDENCE_DIR ?? ".workflow/sessions/maestro-20260718-235735/runs/20260719-001-maestro-impeccable/evidence",
  "screenshots",
);
const consoleErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }, testInfo) => {
  mkdirSync(evidenceRoot, { recursive: true });
  const errors: string[] = [];
  consoleErrors.set(page, errors);
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(async ({ page }, testInfo) => {
  const errors = consoleErrors.get(page) ?? [];
  await testInfo.attach("console-errors", { body: JSON.stringify(errors, null, 2), contentType: "application/json" });
  expect(errors).toEqual([]);
});

test("model discovery and provider comparison drill down", async ({ page }, testInfo) => {
  await page.goto("/models?q=Kimi+K2.6");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "模型目录" })).toBeVisible();
  await page.locator('a[href="/models/moonshotai/kimi-k2.6"]').click();
  await page.waitForURL("**/models/moonshotai/kimi-k2.6", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Kimi K2.6" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "比较供应商" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByRole("dialog").getByText("moonshotai/kimi-k2.6")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-model-dialog.png`), fullPage: true });
});

test("provider catalog opens the all-models dialog", async ({ page }, testInfo) => {
  await page.goto("/providers/nano-gpt");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "NanoGPT" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "价格体系: CNY" }).click();
  await expect(page.getByRole("button", { name: "价格体系: CNY" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("columnheader", { name: "CNY 输入价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "CNY 输出价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "CNY 缓存读取价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "CNY 缓存创建价" })).toBeVisible();
  await expect(page.locator(".detail-main .missing").first()).toHaveText("-");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await expect.poll(() => page.locator(".detail-main .table-frame").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-provider-detail-pricing.png`), fullPage: true });
  await page.getByRole("button", { name: "查看全部模型" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/nano-gpt/).first()).toBeVisible();
  await expect(dialog.getByRole("columnheader", { name: "CNY 输入价" })).toBeVisible();
  await expect(dialog.getByRole("columnheader", { name: "CNY 输出价" })).toBeVisible();
  await expect(dialog.getByRole("columnheader", { name: "CNY 缓存读取价" })).toBeVisible();
  await expect(dialog.getByRole("columnheader", { name: "CNY 缓存创建价" })).toBeVisible();
  await expect(dialog.locator(".missing").first()).toHaveText("-");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await expect.poll(() => dialog.locator(".modal-content").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-provider-dialog.png`), fullPage: true });
});

test("source and quality pages use live catalog data", async ({ page }, testInfo) => {
  await page.goto("/sources"); await page.waitForLoadState("networkidle");
  await expect(page.getByText("ai-pricing", { exact: true })).toBeVisible();
  await expect(page.getByText("model-price-hub", { exact: true })).toBeVisible();
  await page.goto("/compare"); await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "模型对比" })).toBeVisible();
  await expect(page.getByText("22 / 22 已映射模型").first()).toBeVisible();
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-quality.png`), fullPage: true });
});

test("locale and theme controls persist UI preferences", async ({ page }, testInfo) => {
  await page.goto("/models"); await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "切换语言" }).click();
  await expect(page.getByRole("heading", { name: "Models" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect.poll(() => page.context().cookies().then((cookies) => cookies.find((cookie) => cookie.name === "llm-locale")?.value)).toBe("en");
  await page.getByRole("button", { name: /Change theme/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: /Change theme/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-dark.png`), fullPage: true });
});

test("price system controls model pricing columns and persists", async ({ page }, testInfo) => {
  await page.goto("/models"); await page.waitForLoadState("networkidle");
  await expect(page.getByRole("columnheader", { name: "USD 输入价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "USD 输出价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "USD 缓存读取价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "USD 缓存创建价" })).toBeVisible();
  await page.getByRole("button", { name: "价格体系: CNY" }).click();
  await expect(page.getByRole("button", { name: "价格体系: CNY" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("columnheader", { name: "CNY 输入价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "CNY 缓存创建价" })).toBeVisible();
  await expect.poll(() => page.context().cookies().then((cookies) => cookies.find((cookie) => cookie.name === "llm-currency")?.value)).toBe("CNY");
  await page.reload();
  await expect(page.getByRole("columnheader", { name: "CNY 输出价" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await expect.poll(() => page.locator(".table-frame").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-currency-system.png`), fullPage: true });
});

test("mobile navigation and tables remain usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only composition check");
  await page.goto("/models"); await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "模型目录" })).toBeVisible();
  await page.getByRole("button", { name: "打开导航" }).click();
  await expect(page.getByRole("dialog").getByRole("navigation", { name: "主导航" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceRoot, "mobile-navigation.png"), fullPage: true });
});
