import { defineConfig } from "vite";

// Vite config used by `playwright test` to serve the browser smoke harness.
// - root: test/browser (where harness.html + harness-worker.html live)
// - publicDir: dist (so harness.html can import /dist/rnp.js + /dist/rnp.wasm)
// Strict port so Playwright's webServer.url check matches exactly.
export default defineConfig({
  root: "test/browser",
  publicDir: "../../dist",
  build: { outDir: "../../dist-playwright", emptyOutDir: true },
  server: { strictPort: true },
  preview: { strictPort: true, port: 4173 },
});
