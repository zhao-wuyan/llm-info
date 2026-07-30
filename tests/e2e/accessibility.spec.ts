import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const route of ["/models", "/providers", "/sources", "/compare"]) {
  test(`has no serious accessibility violations: ${route}`, async ({ page }) => {
    test.setTimeout(route === "/compare" ? 90_000 : 30_000);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const result = await new AxeBuilder({ page }).analyze();
    const blocking = result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
    expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
  });
}

test("compare pagination has no serious accessibility violations", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/compare?sort=name&order=asc&cols=input&page=2");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("navigation", { name: "Pagination" })).toBeVisible();
  await expect(page.locator(".pagination a[aria-current='page']")).toHaveText("2");
  const result = await new AxeBuilder({ page }).include(".table-frame").analyze();
  const blocking = result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test("model filter picker has no serious accessibility violations", async ({ page }) => {
  await page.goto("/models");
  await page.waitForLoadState("networkidle");
  await page.locator(".model-filter-picker summary").click();
  const result = await new AxeBuilder({ page }).include(".model-filter-picker").analyze();
  const blocking = result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test("model comparison dialog has no serious accessibility violations", async ({ page }) => {
  await page.goto("/models/moonshotai/kimi-k2.6");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "比较供应商" }).click();
  const result = await new AxeBuilder({ page }).include("dialog").analyze();
  const blocking = result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test("column picker has no serious accessibility violations", async ({ page }) => {
  await page.goto("/models");
  await page.waitForLoadState("networkidle");
  await page.locator(".column-picker summary").click();
  const result = await new AxeBuilder({ page }).include(".column-picker").analyze();
  const blocking = result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
  expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
});

test.describe("reset filter link", () => {
  for (const route of ["/models", "/compare", "/providers", "/sources"]) {
    test(`${route} control is keyboard accessible and has a coarse-ready target`, async ({ page }, testInfo) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const link = page.getByRole("link", { name: "重置筛选" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("title", "重置筛选");
      await expect(link.locator("svg")).toHaveAttribute("aria-hidden", "true");
      await link.focus();
      await expect(link).toBeFocused();
      const box = await link.boundingBox();
      expect(box, "bounding box").not.toBeNull();
      const min = testInfo.project.name === "mobile" ? 44 : 40;
      expect(box!.height, "link height").toBeGreaterThanOrEqual(min);
      expect(box!.width, "link width").toBeGreaterThanOrEqual(min);
      const result = await new AxeBuilder({ page }).include(".toolbar").analyze();
      const blocking = result.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
      expect(blocking, blocking.map((violation) => `${violation.id}: ${violation.help}`).join("\n")).toEqual([]);
    });
  }

  test("reset filter link uses Chinese label by default", async ({ page }) => {
    for (const route of ["/models", "/compare", "/providers", "/sources"]) {
      await page.goto(route);
      const link = page.getByRole("link", { name: "重置筛选" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("title", "重置筛选");
    }
  });

  test("reset filter link uses English label after locale switch", async ({ page }) => {
    await page.goto("/models");
    await page.getByRole("button", { name: "切换语言" }).click();
    await expect(page.getByRole("heading", { name: "Models" })).toBeVisible();
    for (const route of ["/models", "/compare", "/providers", "/sources"]) {
      await page.goto(route);
      const link = page.getByRole("link", { name: "Reset filters" });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("title", "Reset filters");
    }
  });

  test("Models reset preserves cols and clears filters, sort, page", async ({ page }) => {
    await page.goto("/models?q=test&ability=vision&priced=1&active=1&recent-open=0&weights=open&sort=name&order=asc&page=2&cols=license");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("license");
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/models" && url.searchParams.get("cols") === "license" && !url.searchParams.has("q")),
      page.getByRole("link", { name: "重置筛选" }).click(),
    ]);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/models");
    expect(url.searchParams.get("cols")).toBe("license");
    expect(url.searchParams.get("q")).toBeNull();
    expect(url.searchParams.get("ability")).toBeNull();
    expect(url.searchParams.get("priced")).toBeNull();
    expect(url.searchParams.get("active")).toBeNull();
    expect(url.searchParams.get("recent-open")).toBeNull();
    expect(url.searchParams.get("weights")).toBeNull();
    expect(url.searchParams.get("sort")).toBeNull();
    expect(url.searchParams.get("order")).toBeNull();
    expect(url.searchParams.get("page")).toBeNull();
  });

  test("Models reset preserves cols=none", async ({ page }) => {
    await page.goto("/models?cols=none&q=test");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("none");
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/models" && url.searchParams.get("cols") === "none" && !url.searchParams.has("q")),
      page.getByRole("link", { name: "重置筛选" }).click(),
    ]);
    const url = new URL(page.url());
    expect(url.searchParams.get("cols")).toBe("none");
    expect(url.searchParams.get("q")).toBeNull();
  });

  test("Compare reset preserves cols and restores default AAIndex descending sort", async ({ page }) => {
    await page.goto("/compare?q=test&owner=anthropic&board=lmarena-text&ability=vision&sort=name&order=asc&cols=input");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("input");
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/compare" && url.searchParams.get("cols") === "input" && url.searchParams.get("sort") === "board:aaindex" && url.searchParams.get("order") === "desc"),
      page.getByRole("link", { name: "重置筛选" }).click(),
    ]);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/compare");
    expect(url.searchParams.get("cols")).toBe("input");
    expect(url.searchParams.get("q")).toBeNull();
    expect(url.searchParams.get("owner")).toBeNull();
    expect(url.searchParams.get("board")).toBeNull();
    expect(url.searchParams.get("ability")).toBeNull();
    expect(url.searchParams.get("sort")).toBe("board:aaindex");
    expect(url.searchParams.get("order")).toBe("desc");
  });

  test("Compare reset preserves cols=none and restores default sort", async ({ page }) => {
    await page.goto("/compare?cols=none&q=test&sort=name&order=asc");
    await page.waitForLoadState("networkidle");
    await expect.poll(() => new URL(page.url()).searchParams.get("cols")).toBe("none");
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/compare" && url.searchParams.get("cols") === "none" && url.searchParams.get("sort") === "board:aaindex" && url.searchParams.get("order") === "desc"),
      page.getByRole("link", { name: "重置筛选" }).click(),
    ]);
    const url = new URL(page.url());
    expect(url.searchParams.get("cols")).toBe("none");
    expect(url.searchParams.get("q")).toBeNull();
    expect(url.searchParams.get("sort")).toBe("board:aaindex");
    expect(url.searchParams.get("order")).toBe("desc");
  });

  test("Providers reset clears filters, sort and page", async ({ page }) => {
    await page.goto("/providers?q=test&kind=official&currency=USD&sort=models&order=desc&page=2");
    await page.waitForLoadState("networkidle");
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/providers" && url.search === ""),
      page.getByRole("link", { name: "重置筛选" }).click(),
    ]);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/providers");
    expect(url.search).toBe("");
  });

  test("Sources reset clears filters, sort and page", async ({ page }) => {
    await page.goto("/sources?q=test&role=foo&license=known&sort=records&order=desc");
    await page.waitForLoadState("networkidle");
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/sources" && url.search === ""),
      page.getByRole("link", { name: "重置筛选" }).click(),
    ]);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/sources");
    expect(url.search).toBe("");
  });
});
