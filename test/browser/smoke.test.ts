import { test, expect, type Page } from "@playwright/test";

// Harness writes its result here. Declared as a ambient augmentation so TS
// typechecks the page.evaluate calls.
declare global {
  interface Window {
    __rnpResult?: unknown;
  }
}

// Attach a console + error listener BEFORE navigating, so we can see what
// the page logs even if the test ultimately times out. Useful for debugging
// CI-only browser failures.
function attachListeners(page: Page): void {
  page.on("console", (msg) => {
    console.warn(`[browser ${msg.type()}]`, msg.text());
  });
  page.on("pageerror", (err) => {
    console.warn("[browser pageerror]", err.message);
  });
  page.on("requestfailed", (req) => {
    console.warn("[browser reqfail]", req.url(), req.failure()?.errorText);
  });
}

test("rnp-wasm loads and runs in browser", async ({ page }) => {
  attachListeners(page);
  await page.goto("/test/browser/harness.html");
  // Generous timeout: 10 MB wasm fetch + Botan PK_Signer init is slow on
  // CI shared runners.
  await page.waitForFunction(() => window.__rnpResult !== undefined, { timeout: 120_000 });
  const result = await page.evaluate(() => window.__rnpResult);
  expect(result).toBe("ok");
});

test("WorkerPool spins up a worker and initializes rnp", async ({ page }) => {
  attachListeners(page);
  await page.goto("/test/browser/harness-worker.html");
  await page.waitForFunction(() => window.__rnpResult !== undefined, { timeout: 120_000 });
  const result = await page.evaluate(() => window.__rnpResult);
  expect(result).toBe("ok");
});
