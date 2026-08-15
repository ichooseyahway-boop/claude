import { test, expect } from "@playwright/test";

/** The sample briefing must be a real, working preview — not a static image. */
test("sample briefing is interactive: tabs and source drawer", async ({
  page,
}) => {
  await page.goto("/sample-briefing");

  // Tabs exist and switch panels.
  const todayTab = page.getByRole("tab", { name: /today/i });
  const clarifyTab = page.getByRole("tab", { name: /clarification needed/i });
  await expect(todayTab).toHaveAttribute("aria-selected", "true");

  await clarifyTab.click();
  await expect(clarifyTab).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText(/never turn a vague phrase into a firm date/i),
  ).toBeVisible();

  // Source evidence can be opened on an item.
  await todayTab.click();
  const sourceButton = page
    .getByRole("button", { name: /view source/i })
    .first();
  await sourceButton.click();
  await expect(
    page.getByRole("button", { name: /hide source/i }).first(),
  ).toBeVisible();
});

test("get-started renders the offer summary and a clear next step", async ({
  page,
}) => {
  await page.goto("/get-started");
  await expect(
    page.getByRole("heading", { name: /one step from handing off/i }),
  ).toBeVisible();
  await expect(
    page.getByText("Back-to-School Inbox Rescue").first(),
  ).toBeVisible();
  await expect(page.getByText("$149").first()).toBeVisible();
});

test("onboarding rejects an invalid token gracefully", async ({ page }) => {
  await page.goto("/onboarding/definitely-not-a-real-token");
  await expect(page.getByText(/isn.t valid/i)).toBeVisible();
});

test("hero and a start CTA are usable with no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  // A visible header CTA to begin the rescue exists on every breakpoint
  // ("Start My Rescue" on desktop, "Start" on mobile). Use :visible because the
  // other breakpoint's CTA is present-but-hidden in the DOM.
  await expect(
    page.locator('header a[href="/get-started"]:visible').first(),
  ).toBeVisible();
});
