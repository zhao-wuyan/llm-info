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
  await page.route("**/_vercel/**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
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
  await expect(page.getByRole("columnheader", { name: "缓存读 USD" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "缓存写 USD" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "比较供应商" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator("button.sortable-header")).toHaveCount(5);
  await expect(page.getByRole("dialog").getByRole("columnheader", { name: "缓存读 USD" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("columnheader", { name: "缓存写 USD" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "排序 缓存写 USD: 正序" }).click();
  await expect(page.getByRole("dialog").getByRole("columnheader", { name: /排序 缓存写 USD/ })).toHaveAttribute("aria-sort", "ascending");
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
  await expect(page.locator(".provider-preview-price-table .sortable-header")).toHaveCount(7);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "价格体系: CNY" }).click();
  await expect(page.getByRole("button", { name: "价格体系: CNY" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("columnheader", { name: "输入 CNY" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "输出 CNY" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "缓存读 CNY" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "缓存写 CNY" })).toBeVisible();
  await expect(page.locator(".detail-main .missing").first()).toHaveText("-");
  await page.getByRole("link", { name: "排序 发布时间: 正序" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("released");
  await expect(page.getByRole("columnheader", { name: /排序 发布时间/ })).toHaveAttribute("aria-sort", "ascending");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await expect.poll(() => page.locator(".detail-main .table-frame").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-provider-detail-pricing.png`), fullPage: true });
  await page.getByRole("button", { name: "查看全部模型" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/nano-gpt/).first()).toBeVisible();
  await expect(dialog.getByRole("columnheader", { name: "输入 CNY" })).toBeVisible();
  await expect(dialog.getByRole("columnheader", { name: "输出 CNY" })).toBeVisible();
  await expect(dialog.getByRole("columnheader", { name: "缓存读 CNY" })).toBeVisible();
  await expect(dialog.getByRole("columnheader", { name: "缓存写 CNY" })).toBeVisible();
  await expect(dialog.locator("thead th").nth(7)).toHaveText("能力");
  await expect(dialog.locator("thead th").nth(8)).toHaveAttribute("aria-label", "详情");
  await expect(dialog.locator(".missing").first()).toHaveText("-");
  await expect(dialog.locator("button.sortable-header")).toHaveCount(7);
  await dialog.getByRole("button", { name: "排序 模型: 正序" }).click();
  await expect(dialog.getByRole("columnheader", { name: /排序 模型/ })).toHaveAttribute("aria-sort", "ascending");
  await dialog.getByRole("button", { name: "排序 发布时间: 正序" }).click();
  await expect(dialog.getByRole("columnheader", { name: /排序 发布时间/ })).toHaveAttribute("aria-sort", "ascending");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await expect.poll(() => dialog.locator(".modal-content").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-provider-dialog.png`), fullPage: true });
  await dialog.locator(".modal-content").evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-provider-dialog-end.png`), fullPage: true });
});

test("provider model dialog filters quoted models in the current currency", async ({ page }) => {
  await page.route("**/_vercel/**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await page.goto("/providers/qwen");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "价格体系: CNY" }).click();
  await page.getByRole("button", { name: "查看全部模型" }).click();

  const dialog = page.getByRole("dialog");
  const count = dialog.locator(".modal-footer > span");
  const onlyPriced = dialog.getByRole("checkbox", { name: "只看有报价" });
  const allCount = Number.parseInt(await count.innerText(), 10);

  await onlyPriced.check();
  await expect(onlyPriced).toBeChecked();
  await expect.poll(async () => Number.parseInt(await count.innerText(), 10)).toBeLessThan(allCount);
  await expect.poll(() => dialog.locator("tbody tr").evaluateAll((rows) => rows.every((row) => {
    const priceCells = [...row.querySelectorAll("td")].slice(2, 6);
    return priceCells.some((cell) => cell.textContent?.trim() !== "-");
  }))).toBe(true);

  await onlyPriced.uncheck();
  await expect(onlyPriced).not.toBeChecked();
  await expect.poll(async () => Number.parseInt(await count.innerText(), 10)).toBe(allCount);
});

test("compare sources and quality pages use live catalog data", async ({ page }, testInfo) => {
  await page.goto("/providers"); await page.waitForLoadState("networkidle");
  await expect(page.locator(".provider-catalog-table .sortable-header")).toHaveCount(5);
  await page.goto("/sources"); await page.waitForLoadState("networkidle");
  await expect(page.locator(".source-table .sortable-header")).toHaveCount(2);
  await expect(page.getByText("ai-pricing", { exact: true })).toBeVisible();
  await expect(page.getByText("model-price-hub", { exact: true })).toBeVisible();
  await page.goto("/compare"); await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "模型对比" })).toBeVisible();
  await expect(page.locator(".evidence-banner")).toHaveCount(0);
  const boardCount = (await page.locator('select[name="board"] option').count()) - 1;
  await expect(page.locator(".board-strip a")).toHaveCount(boardCount);
  await expect(page.locator(".board-strip a").first()).toHaveAttribute("target", "_blank");
  await expect(page.locator(".board-strip a").first()).toHaveAttribute("href", /^https?:\/\//);
  await expect(page.getByText(/\d+ \/ \d+ 已映射模型/).first()).toBeVisible();
  await expect(page.getByText(/\d+\/\d+ 列/).first()).toBeVisible();
  await expect(page.locator(".pagination")).toBeVisible();
  await expect(page.locator(".compare-table .sortable-header")).toHaveCount(12);
  const qualityHeader = page.getByRole("columnheader", { name: "排序 AAIndex 综合 AAIndex: 不排序" });
  await expect(qualityHeader).toHaveAttribute("aria-sort", "descending");
  await expect(qualityHeader.locator("a.sortable-header")).toHaveAttribute("href", /sort=none/);
  const qualityValues = (await page.locator(".compare-table tbody tr td:nth-child(3) .comparison-bar-value strong").allTextContents()).map(Number);
  expect(qualityValues).toEqual([...qualityValues].sort((left, right) => right - left));
  await expect(page.getByRole("columnheader", { name: "输入 USD" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "输出 USD" })).toBeVisible();
  const releasedSort = page.getByRole("link", { name: "排序 发布时间: 正序" });
  if (testInfo.project.name === "mobile") await releasedSort.evaluate((element: HTMLAnchorElement) => element.click());
  else await releasedSort.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("released");
  await expect(page.getByRole("columnheader", { name: /排序 发布时间/ })).toHaveAttribute("aria-sort", "ascending");
  const firstComparisonRow = page.locator(".compare-table tbody tr").first();
  await expect(firstComparisonRow.locator(".comparison-bar")).toHaveCount(10);
  const barTones = await firstComparisonRow.locator(".comparison-bar").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-tone")));
  expect(barTones).toEqual(["quality", "quality", "quality", "quality", "quality", "input", "output", "cache-read", "cache-write", "context"]);
  const lightBarColors = await firstComparisonRow.locator(".comparison-bar-track > i").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor));
  expect(new Set(lightBarColors).size).toBe(6);
  await expect(firstComparisonRow.locator(".comparison-bar-track > .comparison-bar-value")).toHaveCount(10);
  await expect(firstComparisonRow.locator(".comparison-bar-value").first()).toHaveCSS("position", "absolute");
  await expect(firstComparisonRow.locator(".ability-comparison-cell .tag")).toHaveCount(1);
  await expect(page.getByRole("columnheader", { name: "视觉理解" })).toBeVisible();
  await expect(page.locator(".compare-table thead th").last()).toHaveText("视觉理解");
  await expect(page.getByRole("columnheader", { name: "工具调用" })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "推理" })).toHaveCount(0);
  await page.getByRole("button", { name: "价格体系: CNY" }).click();
  await expect(page.getByRole("columnheader", { name: "输入 CNY" })).toBeVisible();
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

test("compare pagination: name sorting remains global and retains sort state", async ({ page }) => {
  await page.goto("/compare?sort=name&order=asc&cols=input");
  await expect(page.locator(".compare-table tbody tr")).toHaveCount(50);
  const firstPageNames = await page.locator(".compare-table tbody .entity-title").allTextContents();
  const nextPage = page.getByRole("link", { name: "下一页 / Next page" });
  await expect(nextPage).toHaveAttribute("href", /page=2/);
  await expect(nextPage).toHaveAttribute("href", /sort=name/);
  await expect(nextPage).toHaveAttribute("href", /order=asc/);
  await expect(nextPage).toHaveAttribute("href", /cols=input/);
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get("page") === "2"),
    nextPage.click(),
  ]);
  await expect(page.locator(".compare-table tbody tr").first()).toBeVisible();
  const secondPageNames = await page.locator(".compare-table tbody .entity-title").allTextContents();
  const visibleNames = [...firstPageNames, ...secondPageNames];
  expect(visibleNames).toEqual([...visibleNames].sort((left, right) => left.localeCompare(right)));
});

test("compare pagination: numeric sorting keeps missing prices last and uses global maxima", async ({ page }) => {
  for (const order of ["asc", "desc"] as const) {
    await page.goto(`/compare?sort=input&order=${order}&cols=input`);
    const inputBars = page.locator(".compare-table tbody tr td:nth-child(3) .comparison-bar");
    await expect(inputBars.first()).toBeVisible();
    const firstPageWidths = await inputBars.locator(".comparison-bar-track > i").evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).style.width));
    if (order === "asc") expect(firstPageWidths).not.toContain("100%");
    else expect(firstPageWidths).toContain("100%");
    expect(await page.locator(".compare-table tbody tr td:nth-child(3) .comparison-bar.is-missing").count()).toBe(0);

    const lastPage = Math.max(...(await page.locator(".pagination a").allTextContents())
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0));
    await page.goto(`/compare?sort=input&order=${order}&cols=input&page=${lastPage}`);
    await expect(page.locator(".compare-table tbody tr").first()).toBeVisible();
    const missing = await page.locator(".compare-table tbody tr td:nth-child(3) .comparison-bar")
      .evaluateAll((elements) => elements.map((element) => element.classList.contains("is-missing")));
    const firstMissing = missing.indexOf(true);
    expect(firstMissing).toBeGreaterThanOrEqual(0);
    expect(missing.slice(firstMissing).every(Boolean)).toBe(true);
  }
});

test("compare pagination: clamps oversized pages, resets page state, and keeps overflow local", async ({ page }) => {
  await page.goto("/compare?sort=none&cols=input&page=999");
  await expect(page.locator(".pagination a[aria-current='page']")).toBeVisible();
  const clampedPage = Math.max(...(await page.locator(".pagination a").allTextContents())
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0));
  await expect(page.locator(".pagination a[aria-current='page']")).toHaveText(String(clampedPage));
  expect(await page.locator(".compare-table tbody tr").count()).toBeLessThanOrEqual(50);
  await expect(page.locator(".toolbar input[name='page']")).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: /排序 模型/ }).locator("a")).not.toHaveAttribute("href", /page=/);
  await page.locator(".column-picker summary").click();
  await expect(page.locator(".column-picker").getByRole("link", { name: "恢复默认列" })).not.toHaveAttribute("href", /page=/);

  const owner = await page.locator('select[name="owner"] option').nth(1).getAttribute("value")
    ?? await page.locator('select[name="owner"] option').nth(1).textContent();
  await page.goto(`/compare?q=a&owner=${encodeURIComponent(owner ?? "")}&board=aaindex&ability=reasoning&cols=input&sort=none&page=999`);
  await page.locator(".column-picker summary").click();
  const resetColumns = page.locator(".column-picker").getByRole("link", { name: "恢复默认列" });
  await expect(resetColumns).toBeAttached();
  for (const state of ["q=a", `owner=${encodeURIComponent(owner ?? "")}`, "board=aaindex", "ability=reasoning", "sort=none"]) {
    await expect(resetColumns).toHaveAttribute("href", new RegExp(state));
  }
  await expect(resetColumns).not.toHaveAttribute("href", /page=/);

  await page.goto("/compare");
  await expect(page.locator(".table-scroll")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  await expect.poll(() => page.locator(".table-scroll").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
});

test("locale and theme controls persist UI preferences", async ({ page }, testInfo) => {
  await page.goto("/models"); await page.waitForLoadState("networkidle");
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "打开导航" }).click();
  const projectLink = page.getByRole("link", { name: "在 GitHub 查看 LLM Info 项目" });
  await expect(projectLink).toBeVisible();
  await expect(projectLink).toHaveAttribute("href", "https://github.com/zhao-wuyan/llm-info");
  await expect(projectLink).toHaveAttribute("target", "_blank");
  await expect(projectLink).toHaveAttribute("rel", "noreferrer");
  if (testInfo.project.name === "mobile") await page.keyboard.press("Escape");
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
  await expect(page.getByRole("columnheader", { name: "输入 USD" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "输出 USD" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "缓存读 USD" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "缓存写 USD" })).toBeVisible();
  const priceHeader = page.getByRole("columnheader", { name: "输入 USD" });
  const currencySubtitle = priceHeader.locator(".sortable-header-copy small");
  await expect(priceHeader.locator(".sortable-header-copy > span")).toHaveText("输入");
  await expect(currencySubtitle).toHaveText("USD");
  await expect.poll(async () => {
    const [labelSize, subtitleSize] = await priceHeader.locator(".sortable-header-copy").evaluate((element) => {
      const label = element.querySelector("span")!;
      const subtitle = element.querySelector("small")!;
      return [Number.parseFloat(getComputedStyle(label).fontSize), Number.parseFloat(getComputedStyle(subtitle).fontSize)];
    });
    return subtitleSize < labelSize;
  }).toBe(true);
  await expect(currencySubtitle).toHaveCSS("color", "rgb(95, 109, 103)");
  await page.getByRole("button", { name: "价格体系: CNY" }).click();
  await expect(page.getByRole("button", { name: "价格体系: CNY" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("columnheader", { name: "输入 CNY" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "缓存写 CNY" })).toBeVisible();
  await expect.poll(() => page.context().cookies().then((cookies) => cookies.find((cookie) => cookie.name === "llm-currency")?.value)).toBe("CNY");
  await page.reload();
  await expect(page.getByRole("columnheader", { name: "输出 CNY" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await expect.poll(() => page.locator(".table-scroll").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-currency-system.png`), fullPage: true });
});

test("model price filter follows the current currency and survives sorting and pagination", async ({ page }, testInfo) => {
  await page.goto("/models");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "价格体系: CNY" }).click();
  await expect(page.getByRole("columnheader", { name: "输入 CNY" })).toBeVisible();

  const table = page.locator(".model-price-table");
  const filterPicker = page.locator(".model-filter-picker");
  await filterPicker.locator("summary").click();
  const onlyPriced = filterPicker.getByRole("checkbox", { name: "只看有报价" });
  const allCount = Number.parseInt(await page.locator(".table-footer > span").innerText(), 10);
  await onlyPriced.check();
  await filterPicker.getByRole("button", { name: "应用筛选" }).click();

  await expect.poll(() => new URL(page.url()).searchParams.get("priced")).toBe("1");
  await filterPicker.locator("summary").click();
  await expect(onlyPriced).toBeChecked();
  await filterPicker.locator("summary").click();
  const pricedCount = Number.parseInt(await page.locator(".table-footer > span").innerText(), 10);
  expect(pricedCount).toBeLessThan(allCount);
  await expect.poll(() => table.locator("tbody tr").evaluateAll((rows) => rows.every((row) => {
    const priceCells = [...row.querySelectorAll("td")].slice(3, 7);
    return priceCells.some((cell) => cell.textContent?.trim() !== "-");
  }))).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-model-priced-filter.png`), fullPage: true });

  await table.getByRole("link", { name: "排序 模型: 正序" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("priced")).toBe("1");
  const pageTwo = page.getByRole("navigation", { name: "Pagination" }).getByRole("link", { name: "2", exact: true });
  await expect(pageTwo).toHaveAttribute("href", /priced=1/);
  await pageTwo.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBe("2");
  await expect.poll(() => new URL(page.url()).searchParams.get("priced")).toBe("1");

  await filterPicker.locator("summary").click();
  await onlyPriced.uncheck();
  await filterPicker.getByRole("button", { name: "应用筛选" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("priced")).toBeNull();
  await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBeNull();
  await filterPicker.locator("summary").click();
  await expect(onlyPriced).not.toBeChecked();
  await expect(page.locator(".table-footer > span")).toContainText(String(allCount));
});

test("model filter picker combines states, resets page and supports keyboard", async ({ page }, testInfo) => {
  await page.goto("/models?q=test&page=2&sort=name&order=asc&cols=weights,license");
  await page.waitForLoadState("networkidle");
  const picker = page.locator(".model-filter-picker");
  const summary = picker.locator("summary");
  await summary.click();
  const panel = picker.locator(".model-filter-picker-panel");
  await expect(panel).toBeVisible();

  const priced = picker.getByRole("checkbox", { name: "只看有报价" });
  const active = picker.getByRole("checkbox", { name: "只看生命周期内" });
  const recentOpen = picker.getByRole("checkbox", { name: "开源仅近 1 年或 2 代" });

  await priced.check();
  await active.check();
  await recentOpen.uncheck();
  await picker.getByRole("button", { name: "应用筛选" }).click();
  await expect(panel).not.toBeVisible();

  await expect.poll(() => new URL(page.url()).searchParams.get("priced")).toBe("1");
  await expect.poll(() => new URL(page.url()).searchParams.get("active")).toBe("1");
  await expect.poll(() => new URL(page.url()).searchParams.get("recent-open")).toBe("0");
  await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBeNull();
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("test");
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("name");
  await expect.poll(() => new URL(page.url()).searchParams.get("order")).toBe("asc");
  await expect.poll(() => {
    const values = new URL(page.url()).searchParams.getAll("cols");
    return values.flatMap((value) => value.split(","));
  }).toEqual(["weights", "license"]);
  await expect(page.locator(".model-filter-picker")).toHaveCount(1);
  const currentPicker = page.locator(".model-filter-picker");
  const currentSummary = currentPicker.locator("summary");
  await expect(currentSummary.locator("small")).toHaveText("2");
  await expect(currentSummary).toBeVisible();

  await currentSummary.focus();
  await currentSummary.press("Enter");
  await expect(currentPicker.locator(".model-filter-picker-panel")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(currentPicker.getByRole("checkbox", { name: "只看有报价" })).toBeFocused();
  await currentSummary.focus();
  await currentSummary.press("Enter");
  await expect(currentPicker.locator(".model-filter-picker-panel")).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-model-filter-picker.png`), fullPage: true });
});

test("only active retains mixed lifecycle models and excludes selected sunset models", async ({ page }) => {
  await page.goto("/models?q=deepseek-ai%2Fdeepseek-r1&active=1&recent-open=0");
  await page.waitForLoadState("networkidle");
  const picker = page.locator(".model-filter-picker");
  await picker.locator("summary").click();
  const active = picker.getByRole("checkbox", { name: "只看生命周期内" });
  await expect(active).toBeChecked();
  await expect(page.locator('a[href="/models/deepseek-ai/deepseek-r1"]')).toBeVisible();

  await page.goto("/models?q=Grok+3&active=1&recent-open=0");
  await page.waitForLoadState("networkidle");
  await picker.locator("summary").click();
  await expect(active).toBeChecked();
  await expect(page.locator('a[href="/models/xai/grok-3"]')).toHaveCount(0);
});

test("model table headers cycle sorting across the complete filtered dataset", async ({ page }, testInfo) => {
  await page.goto("/models?q=512-x-512");
  await page.waitForLoadState("networkidle");
  const truncatedName = page.locator(".model-price-table .entity-title").first();
  const truncatedId = page.locator(".model-price-table .entity-name small").first();
  await expect(truncatedName).toHaveAttribute("title", /512-x-512/);
  await expect(truncatedId).toHaveAttribute("title", /512-x-512/);
  if (testInfo.project.name === "mobile") {
    await expect(truncatedName).toHaveCSS("white-space", "normal");
    await expect(truncatedId).toHaveCSS("white-space", "normal");
    await expect.poll(() => page.locator(".table-scroll").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  } else {
    await expect(truncatedName).toHaveCSS("text-overflow", "ellipsis");
    await expect(truncatedId).toHaveCSS("text-overflow", "ellipsis");
    await expect.poll(() => truncatedName.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }

  await page.goto("/models");
  await page.waitForLoadState("networkidle");
  const table = page.locator(".model-price-table");
  const modelHeader = table.locator("thead th").first();
  await expect(table.locator("thead .sortable-header")).toHaveCount(9);
  await expect(table.locator("thead th")).toHaveCount(11);
  await expect(table.locator("thead th").nth(9)).toHaveText("能力");
  await expect(table.locator("thead th").nth(10)).toHaveText("");
  await expect(page.locator('select[name="sort"]')).toHaveCount(0);
  await expect(table).toHaveCSS("table-layout", "auto");

  await page.goto("/models?cols=all");
  await page.waitForLoadState("networkidle");
  await expect(table.locator("thead .sortable-header")).toHaveCount(20);
  await expect(table.locator("thead th")).toHaveCount(22);
  await table.getByRole("link", { name: "排序 模型: 正序" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("name");
  await expect.poll(() => new URL(page.url()).searchParams.get("order")).toBe("asc");
  await expect(modelHeader).toHaveAttribute("aria-sort", "ascending");

  await table.getByRole("link", { name: "排序 模型: 倒序" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("order")).toBe("desc");
  await expect(modelHeader).toHaveAttribute("aria-sort", "descending");

  await table.getByRole("link", { name: "排序 模型: 不排序" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBeNull();
  await expect.poll(() => new URL(page.url()).searchParams.get("order")).toBeNull();
  await expect(modelHeader).toHaveAttribute("aria-sort", "none");

  await table.getByRole("link", { name: "排序 发布时间: 正序" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("released");
  await expect(table.getByRole("columnheader", { name: /排序 发布时间/ })).toHaveAttribute("aria-sort", "ascending");
  const releasedValues = (await table.locator("tbody tr td:nth-child(2)").allTextContents()).filter((value) => value !== "-").map((value) => {
    const [year, month, day = "1"] = value.split("-");
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  });
  expect(releasedValues).toEqual([...releasedValues].sort((left, right) => left - right));

  await table.getByRole("link", { name: "排序 供应商数: 正序" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("providers");
  await expect.poll(() => new URL(page.url()).searchParams.get("order")).toBe("asc");
  const firstPageCounts = (await table.locator("tbody tr td:nth-child(5)").allTextContents()).map(Number);
  const pageTwo = page.getByRole("navigation", { name: "Pagination" }).getByRole("link", { name: "2", exact: true });
  await expect(pageTwo).toHaveAttribute("href", /sort=providers/);
  await expect(pageTwo).toHaveAttribute("href", /order=asc/);
  await pageTwo.click();
  await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBe("2");
  const secondPageCounts = (await table.locator("tbody tr td:nth-child(5)").allTextContents()).map(Number);
  expect(Math.max(...firstPageCounts)).toBeLessThanOrEqual(Math.min(...secondPageCounts));
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-model-global-sort.png`), fullPage: true });
  await table.evaluate((element) => { if (element.parentElement) element.parentElement.scrollLeft = element.parentElement.scrollWidth; });
  await page.screenshot({ path: path.join(evidenceRoot, `${testInfo.project.name}-model-global-sort-end.png`), fullPage: true });
});

test("mobile navigation and tables remain usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only composition check");
  await page.goto("/models"); await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "模型目录" })).toBeVisible();
  await page.getByRole("button", { name: "打开导航" }).click();
  await expect(page.getByRole("dialog").getByRole("navigation", { name: "主导航" })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceRoot, "mobile-navigation.png"), fullPage: true });
});

test.describe("column persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/models");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => {
      localStorage.removeItem("llm-info:models:columns:v1");
      localStorage.removeItem("llm-info:compare:columns:v1");
    });
  });

  test("Models column picker persists and resets", async ({ page }) => {
    const picker = page.locator(".column-picker");
    await picker.locator("summary").click();
    const panel = picker.locator(".column-picker-panel");
    await expect(panel).toBeVisible();

    await panel.locator('input[type="checkbox"][value="context"]').uncheck();
    await panel.locator('input[type="checkbox"][value="maxOutput"]').check();
    await panel.getByRole("button", { name: "应用" }).click();

    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("released,maxOutput,input,output,cacheRead,cacheWrite,weights,parameters,ability");
    await expect(page.getByRole("columnheader", { name: "上下文" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "最大输出" })).toBeVisible();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("released,maxOutput,input,output,cacheRead,cacheWrite,weights,parameters,ability");
    await expect(page.getByRole("columnheader", { name: "上下文" })).toHaveCount(0);

    await page.goto("/providers");
    await page.waitForLoadState("networkidle");
    await page.goto("/models");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("released,maxOutput,input,output,cacheRead,cacheWrite,weights,parameters,ability");
    await expect(page.getByRole("columnheader", { name: "上下文" })).toHaveCount(0);

    await picker.locator("summary").click();
    await panel.getByRole("link", { name: "恢复默认列" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBeNull();
    await expect(page.getByRole("columnheader", { name: "上下文" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "最大输出" })).toHaveCount(0);
  });

  test("Models empty column selection survives", async ({ page }) => {
    const picker = page.locator(".column-picker");
    await picker.locator("summary").click();
    const panel = picker.locator(".column-picker-panel");
    const checkboxes = panel.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) await checkboxes.nth(i).uncheck();
    await panel.getByRole("button", { name: "应用" }).click();

    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("none");
    await expect(page.locator(".model-price-table thead th")).toHaveCount(2);

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("none");
    await expect(page.locator(".model-price-table thead th")).toHaveCount(2);
  });

  test("Models column storage is applied when URL cols are absent", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("llm-info:models:columns:v1", "released,parameters");
    });
    await page.goto("/models");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("released,parameters");
    await expect(page.getByRole("columnheader", { name: "发布时间" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "参数量" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "上下文" })).toHaveCount(0);
  });

  test("URL columns win over stored columns", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("llm-info:models:columns:v1", "context");
    });
    await page.goto("/models?cols=released");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("released");
    await expect(page.getByRole("columnheader", { name: "发布时间" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "上下文" })).toHaveCount(0);
  });

  test("Models and Compare column storage are isolated after applying", async ({ page }) => {
    const modelPicker = page.locator(".column-picker");
    await modelPicker.locator("summary").click();
    await modelPicker.locator(".column-picker-panel").locator('input[type="checkbox"][value="context"]').uncheck();
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/models" && url.searchParams.get("cols") === "released,input,output,cacheRead,cacheWrite,weights,parameters,ability"),
      modelPicker.locator(".column-picker-panel").getByRole("button", { name: "应用" }).click(),
    ]);
    await expect(page.getByRole("columnheader", { name: "上下文" })).toHaveCount(0);

    await page.goto("/compare");
    await page.waitForLoadState("networkidle");
    const comparePicker = page.locator(".column-picker");
    await comparePicker.locator("summary").click();
    await comparePicker.locator(".column-picker-panel").locator('input[type="checkbox"][value="context"]').uncheck();
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/compare" && Boolean(url.searchParams.get("cols"))),
      comparePicker.locator(".column-picker-panel").getByRole("button", { name: "应用" }).click(),
    ]);
    const compareCols = new URL(page.url()).searchParams.get("cols");
    expect(compareCols).toBeTruthy();
    await expect(page.getByRole("columnheader", { name: "上下文" })).toHaveCount(0);

    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys).toContain("llm-info:models:columns:v1");
    expect(keys).toContain("llm-info:compare:columns:v1");
    const values = await page.evaluate(() => ({
      models: localStorage.getItem("llm-info:models:columns:v1"),
      compare: localStorage.getItem("llm-info:compare:columns:v1"),
    }));
    expect(values.models).not.toBe(values.compare);
  });

  test("Models and Compare restore their own stored columns without cross contamination", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("llm-info:models:columns:v1", "released,parameters");
      localStorage.setItem("llm-info:compare:columns:v1", "context,vision");
    });

    await page.goto("/models");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("released,parameters");
    await expect(page.getByRole("columnheader", { name: "发布时间" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "参数量" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "上下文" })).toHaveCount(0);

    await page.goto("/compare");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("context,vision");
    await expect(page.getByRole("columnheader", { name: "上下文" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "视觉理解" })).toBeVisible();
  });

  test("Models reset columns preserves filters and sort", async ({ page }) => {
    await page.goto("/models?q=test&sort=name&order=asc&cols=license");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("columnheader", { name: "模型许可" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "发布时间" })).toHaveCount(0);
    const picker = page.locator(".column-picker");
    await picker.locator("summary").click();
    await picker.locator(".column-picker-panel").getByRole("link", { name: "恢复默认列" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBeNull();
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("test");
    await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("name");
    await expect.poll(() => new URL(page.url()).searchParams.get("order")).toBe("asc");
    await expect(page.getByRole("columnheader", { name: "发布时间" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "模型许可" })).toHaveCount(0);
  });

  test("Compare reset columns preserves sort=none", async ({ page }) => {
    await page.goto("/compare?sort=none&cols=input");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("none");
    const picker = page.locator(".column-picker");
    await picker.locator("summary").click();
    await picker.locator(".column-picker-panel").getByRole("link", { name: "恢复默认列" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBeNull();
    await expect.poll(() => new URL(page.url()).searchParams.get("sort")).toBe("none");
  });

  test("column picker supports keyboard", async ({ page }) => {
    const summary = page.locator(".column-picker summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    const panel = page.locator(".column-picker-panel");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(panel.locator('input[type="checkbox"]').first()).toBeFocused();
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(panel).not.toBeVisible();
  });

  test("toolbar select preserves applied cols and ignores unapplied draft", async ({ page }) => {
    await page.goto("/models?cols=none");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("none");
    await expect(page.getByRole("columnheader", { name: "上下文" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "发布时间" })).toHaveCount(0);

    const picker = page.locator(".column-picker");
    await picker.locator("summary").click();
    await picker.locator(".column-picker-panel").locator('input[type="checkbox"][value="context"]').check();
    await picker.locator(".column-picker-panel").locator('input[type="checkbox"][value="released"]').check();

    await Promise.all([
      page.waitForURL((url) => url.pathname === "/models" && url.searchParams.get("cols") === "none" && url.searchParams.get("ability") === "reasoning"),
      page.locator('select[name="ability"]').selectOption("reasoning"),
    ]);

    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("none");
    await expect.poll(() => new URL(page.url()).searchParams.get("ability")).toBe("reasoning");
    await expect(page.getByRole("columnheader", { name: "上下文" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "发布时间" })).toHaveCount(0);
  });
});
