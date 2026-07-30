import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/browser",
  // Generous timeout: 10 MB wasm load + Botan init can take 30-60s on
  // CI shared runners (vs <2s locally). Better to wait than flake.
  timeout: 180_000,
  fullyParallel: false,
  retries: 0,
  use: {
    // baseURL is the python http.server root. Harnesses live at
    // /test/browser/* — paths are spelled out in test files so they
    // don't depend on how playwright resolves relative URLs against
    // baseURL's path component (it doesn't, cleanly).
    baseURL: "http://127.0.0.1:4173",
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
