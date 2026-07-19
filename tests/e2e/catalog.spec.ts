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
  await expect(page.locator(".model-channel-table .sortable-header")).toHaveCount(5);
  await expect(page.getByRole("columnheader", { name: "USD 缓存读取价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "USD 缓存创建价" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "比较供应商" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator("button.sortable-header")).toHaveCount(5);
  await expect(page.getByRole("dialog").getByRole("columnheader", { name: "USD 缓存读取价" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("columnheader", { name: "USD 缓存创建价" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "排序 USD 缓存创建价: 正序" }).click();
  await expect(page.getByRole("dialog").getByRole("columnheader", { name: /排序 USD 缓存创建价/ })).toHaveAttribute("aria-sort", "ascending");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await expect.poll(() => page.getByRole("dialog").locator(".modal-content").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  await expect(page.getByRole("dialog").getByText("moonshotai/kimi-k2.6")).toBeVisible();
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-model-dialog.png`), fullPage: true });
});

test("provider catalog opens the all-models dialog", async ({ page }, testInfo) => {
  await page.goto("/providers/nano-gpt");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "NanoGPT" })).toBeVisible();
  await expect(page.locator(".provider-preview-price-table .sortable-header")).toHaveCount(6);
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
  await expect(dialog.locator("button.sortable-header")).toHaveCount(6);
  await dialog.getByRole("button", { name: "排序 模型: 正序" }).click();
  await expect(dialog.getByRole("columnheader", { name: /排序 模型/ })).toHaveAttribute("aria-sort", "ascending");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await expect.poll(() => dialog.locator(".modal-content").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-provider-dialog.png`), fullPage: true });
});

test("source and quality pages use live catalog data", async ({ page }, testInfo) => {
  await page.goto("/providers"); await page.waitForLoadState("networkidle");
  await expect(page.locator(".provider-catalog-table .sortable-header")).toHaveCount(5);
  await page.goto("/sources"); await page.waitForLoadState("networkidle");
  await expect(page.locator(".source-table .sortable-header")).toHaveCount(2);
  await expect(page.getByText("ai-pricing", { exact: true })).toBeVisible();
  await expect(page.getByText("model-price-hub", { exact: true })).toBeVisible();
  await page.goto("/compare"); await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "模型对比" })).toBeVisible();
  await expect(page.getByText("22 / 22 已映射模型").first()).toBeVisible();
  await expect(page.locator(".compare-table .sortable-header")).toHaveCount(7);
  await expect(page.getByRole("columnheader", { name: "USD 输入价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "USD 输出价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "USD 缓存读取价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "USD 缓存创建价" })).toBeVisible();
  const firstComparisonRow = page.locator(".compare-table tbody tr").first();
  await expect(firstComparisonRow.locator(".comparison-bar")).toHaveCount(6);
  const barTones = await firstComparisonRow.locator(".comparison-bar").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-tone")));
  expect(barTones).toEqual(["quality", "input", "output", "cache-read", "cache-write", "context"]);
  const lightBarColors = await firstComparisonRow.locator(".comparison-bar-track > i").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor));
  expect(new Set(lightBarColors).size).toBe(6);
  await expect(firstComparisonRow.locator(".comparison-bar-track > .comparison-bar-value")).toHaveCount(6);
  await expect(firstComparisonRow.locator(".comparison-bar-value").first()).toHaveCSS("position", "absolute");
  await expect(firstComparisonRow.locator(".ability-comparison-cell .tag")).toHaveCount(1);
  await expect(page.getByRole("columnheader", { name: "视觉理解" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "工具调用" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "推理" })).toHaveCount(0);
  await page.getByRole("button", { name: "价格体系: CNY" }).click();
  await expect(page.getByRole("columnheader", { name: "CNY 输入价" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "CNY 缓存创建价" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await expect.poll(() => page.locator(".compare-table").evaluate((element) => element.parentElement!.scrollWidth > element.parentElement!.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-compare-bars.png`), fullPage: true });
  await page.locator(".compare-table").evaluate((element) => { if (element.parentElement) element.parentElement.scrollLeft = element.parentElement.scrollWidth; });
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-compare-bars-end.png`), fullPage: true });
  await page.locator(".compare-table").evaluate((element) => { if (element.parentElement) element.parentElement.scrollLeft = 0; });
  await page.getByRole("button", { name: /切换主题/ }).click();
  await page.getByRole("button", { name: /切换主题/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const darkBarColors = await firstComparisonRow.locator(".comparison-bar-track > i").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor));
  expect(new Set(darkBarColors).size).toBe(6);
  expect(darkBarColors).not.toEqual(lightBarColors);
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-compare-bars-dark.png`), fullPage: true });
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

test("model table headers cycle sorting across the complete filtered dataset", async ({ page }, testInfo) => {
  await page.goto("/models?q=512-x-512");
  await page.waitForLoadState("networkidle");
  const truncatedName = page.locator(".model-price-table .entity-title").first();
  const truncatedId = page.locator(".model-price-table .entity-name small").first();
  await expect(truncatedName).toHaveCSS("text-overflow", "ellipsis");
  await expect(truncatedId).toHaveCSS("text-overflow", "ellipsis");
  await expect(truncatedName).toHaveAttribute("title", /512-x-512/);
  await expect(truncatedId).toHaveAttribute("title", /512-x-512/);
  await expect.poll(() => truncatedName.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);

  await page.goto("/models");
  await page.waitForLoadState("networkidle");
  const table = page.locator(".model-price-table");
  const modelHeader = table.locator("thead th").first();
  await expect(table.locator("thead .sortable-header")).toHaveCount(7);
  await expect(page.locator('select[name="sort"]')).toHaveCount(0);
  await expect(table).toHaveCSS("table-layout", "fixed");
  const widthsBeforeSort = await table.locator("thead th").evaluateAll((headers) => headers.map((header) => header.getBoundingClientRect().width));

  await table.getByRole("link", { name: "排序 模型: 正序" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("name");
  await expect.poll(() => new URL(page.url()).searchParams.get("order")).toBe("asc");
  await expect(modelHeader).toHaveAttribute("aria-sort", "ascending");
  const widthsAfterSort = await table.locator("thead th").evaluateAll((headers) => headers.map((header) => header.getBoundingClientRect().width));
  expect(widthsAfterSort).toEqual(widthsBeforeSort);

  await table.getByRole("link", { name: "排序 模型: 倒序" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("order")).toBe("desc");
  await expect(modelHeader).toHaveAttribute("aria-sort", "descending");

  await table.getByRole("link", { name: "排序 模型: 不排序" }).click();
  await expect.poll(() => new URL(page.url()).search).toBe("");
  await expect(modelHeader).toHaveAttribute("aria-sort", "none");

  await table.getByRole("link", { name: "排序 供应商数: 正序" }).click();
  const firstPageCounts = (await table.locator("tbody tr td:nth-child(4)").allTextContents()).map(Number);
  const pageTwo = page.getByRole("navigation", { name: "Pagination" }).getByRole("link", { name: "2", exact: true });
  await expect(pageTwo).toHaveAttribute("href", /sort=providers/);
  await expect(pageTwo).toHaveAttribute("href", /order=asc/);
  await pageTwo.click();
  const secondPageCounts = (await table.locator("tbody tr td:nth-child(4)").allTextContents()).map(Number);
  expect(Math.max(...firstPageCounts)).toBeLessThanOrEqual(Math.min(...secondPageCounts));
  await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBe("2");
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-model-global-sort.png`), fullPage: true });
});

test("mobile navigation and tables remain usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only composition check");
  await page.goto("/models"); await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "模型目录" })).toBeVisible();
  await page.getByRole("button", { name: "打开导航" }).click();
  await expect(page.getByRole("dialog").getByRole("navigation", { name: "主导航" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceRoot, "mobile-navigation.png"), fullPage: true });
});
