import { expect, test } from "@playwright/test";

test("raising eot_threshold with the keyboard stops cutting the caller off, and the URL follows", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Cut early.")).toBeVisible();
  const slider = page.getByRole("slider", { name: "eot_threshold" });
  await slider.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Clean turn.")).toBeVisible();
  await expect(page).toHaveURL(/eot=0\.9/);
});

test("a share link restores the exact session and settings", async ({ page }) => {
  await page.goto("/?s=clinic&listen=nova-3&endpointing=300");
  await expect(page.getByRole("radio", { name: "Clinic reschedule" })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Nova-3/ })).toBeChecked();
  await expect(page.getByRole("slider", { name: "Endpointing (silence)" })).toHaveValue("300");
});

test("Get code matches the UI settings", async ({ page }) => {
  await page.goto("/?eot=0.83");
  await page.getByRole("tab", { name: "Get code" }).click();
  await expect(page.getByRole("tabpanel").locator("pre")).toContainText('"eot_threshold": 0.83');
  await page.getByRole("tab", { name: "Python" }).click();
  await expect(page.getByRole("tabpanel").locator("pre").last()).toContainText("DEEPGRAM_API_KEY");
});

test("selecting a turn updates the detail panels", async ({ page }) => {
  await page.goto("/?s=support");
  await page.getByRole("button", { name: /^T1/ }).click();
  await expect(page.getByText("heard up to here")).toBeVisible();
});

test("key creation blocks the FORBIDDEN trap, then reveals the secret once", async ({ page }) => {
  await page.goto("/console/keys");
  await page.getByLabel("Role").selectOption("custom");
  await expect(page.getByRole("alert").filter({ hasText: "FORBIDDEN" })).toContainText("Temporary tokens need a key with Member role or higher");
  await page.getByRole("button", { name: /Use Member instead/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "FORBIDDEN" })).toHaveCount(0);
  await page.getByRole("button", { name: "Create key" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Done" })).toBeDisabled();
  await dialog.getByRole("checkbox", { name: /stored this key/ }).check();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
});

test("usage: filtering errors and inspecting a request", async ({ page }) => {
  await page.goto("/console/usage");
  await page.getByLabel("Status").selectOption("errors");
  await expect(page.getByRole("status").filter({ hasText: "requests" })).not.toHaveText("0 requests");
  await page.getByRole("button", { name: /^Inspect/ }).first().click();
  await expect(page.getByRole("region", { name: /^Request req_/ })).toBeVisible();
});

test("live mic explains a blocked microphone", async ({ page, context }) => {
  await context.clearPermissions();
  await page.addInitScript(() => {
    // Simulate the user denying access.
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: () => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })) },
    });
  });
  await page.goto("/live");
  await page.getByRole("button", { name: "Start microphone" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Microphone" })).toContainText("Microphone access was blocked");
});
