import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
async function violations(page: Page) {
  await page.waitForTimeout(300);
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return r.violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target}`);
}

for (const route of ["/", "/?s=support&listen=nova-3", "/?eager=0.5", "/live", "/console/keys", "/console/usage", "/cosmos", "/notes"]) {
  test(`${route} has no axe violations`, async ({ page }) => {
    await page.goto(route);
    expect(await violations(page)).toEqual([]);
  });
}

test("inspector tabs and the key warning state have no violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Get code" }).click();
  expect(await violations(page)).toEqual([]);
  await page.getByRole("tab", { name: "Cost" }).click();
  expect(await violations(page)).toEqual([]);
  await page.goto("/console/keys");
  await page.getByLabel("Role").selectOption("custom");
  await expect(page.getByRole("alert").filter({ hasText: "FORBIDDEN" })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});
