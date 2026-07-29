import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/node/**/*.test.ts"],
    setupFiles: ["test/node/setup.ts"],
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "threads",
    coverage: {
      provider: "v8",
      include: ["ts/**/*.ts"],
      exclude: ["ts/module-types.ts", "ts/index.ts"],
      reporter: ["text", "html"],
    },
  },
});
