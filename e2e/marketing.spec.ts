import { test, expect } from "@playwright/test";

/**
 * Release 0 acceptance smoke tests (PRD §19):
 *  - A visitor can understand the offer and price on desktop and mobile.
 *  - No fabricated proof appears.
 *  - Accessibility smoke checks pass.
 *  - No horizontal overflow / obvious layout breakage.
 */

test("homepage communicates product, outcome, and price", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /never miss another/i }),
  ).toBeVisible();
  // Trust line: the core promise about access boundaries.
  await expect(page.getByText(/no inbox password/i)).toBeVisible();
  // The offer price is discoverable on the homepage.
  await expect(page.getByText("$149").first()).toBeVisible();
});

test("primary navigation reaches the key pages", async ({ page }, testInfo) => {
  // The persistent horizontal nav is a desktop affordance; mobile uses the menu.
  test.skip(testInfo.project.name === "mobile", "desktop navigation only");
  await page.goto("/");
  for (const [name, heading] of [
    ["How It Works", /three steps/i],
    ["Pricing", /one clear price/i],
    ["Security", /deserves restraint/i],
  ] as const) {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      heading,
    );
  }
});

test("pricing page shows transparent limits and no fake scarcity", async ({
  page,
}) => {
  await page.goto("/pricing");
  await expect(page.getByText("$149").first()).toBeVisible();
  await expect(page.getByText(/what counts as a source item/i)).toBeVisible();
  await expect(page.getByText(/what is not included/i)).toBeVisible();
  // Real, configurable founding-family capacity — not a countdown gimmick.
  await expect(page.getByText(/founding-family/i).first()).toBeVisible();
});

test("no fabricated testimonials, ratings, or customer counts", async ({
  page,
}) => {
  await page.goto("/");
  const body = (await page.textContent("body")) ?? "";
  expect(body).not.toMatch(/★|⭐/);
  expect(body).not.toMatch(
    /\b\d[\d,]*\+?\s+(happy\s+)?(families|customers|parents)\s+(served|trust|love)/i,
  );
  expect(body).not.toMatch(/rated\s+\d(\.\d)?\s*\/\s*5/i);
});

test("accessibility smoke: lang, single h1, skip link", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: /skip to content/i }),
  ).toBeAttached();
});

test("no horizontal overflow on the homepage", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("legal pages are clearly marked as pending review", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByText(/pending legal review/i)).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByText(/pending legal review/i)).toBeVisible();
});
