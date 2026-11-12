import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    include: ["packages/*/src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@worldready/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@worldready/config": path.resolve(__dirname, "packages/config/src/index.ts"),
      "@worldready/parsers": path.resolve(__dirname, "packages/parsers/src/index.ts"),
      "@worldready/rules": path.resolve(__dirname, "packages/rules/src/index.ts"),
      "@worldready/reporters": path.resolve(__dirname, "packages/reporters/src/index.ts"),
      "@worldready/pseudo-localization": path.resolve(__dirname, "packages/pseudo-localization/src/index.ts"),
    },
  },
});
