import { expect, test } from "@playwright/test";

for (const route of ["/", "/live", "/console/keys", "/console/usage", "/cosmos", "/notes"]) {
  test(`${route} has no page-level horizontal scroll`, async ({ page }) => {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
