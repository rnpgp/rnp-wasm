import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/browser",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    // Python http.server runs at project root; harnesses live under
    // /test/browser/. baseURL captures the harness root so test files can
    // use relative paths like "/harness.html".
    baseURL: "http://127.0.0.1:4173/test/browser",
    trace: "retain-on-failure",
  },
  webServer: {
    // Python's built-in HTTP server is reliable across environments; vite
    // preview needed a build step (we don't run), and vite dev mode took
    // 180s+ to come up. Serving from the project root means both
    // /test/browser/harness.html and /dist/* are accessible.
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173/test/browser/harness.html",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox",  use: { ...devices["Desktop Firefox"] } },
    { name: "webkit",   use: { ...devices["Desktop Safari"] } },
  ],
});
