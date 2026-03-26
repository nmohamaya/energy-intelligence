import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/__tests__/**/*.test.ts", "shared/__tests__/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "json-summary"],
      include: [
        "server/**/*.ts",
        "shared/**/*.ts",
      ],
      exclude: [
        "server/__tests__/**",
        "shared/__tests__/**",
        "server/vite.ts",
        "server/static.ts",
        "server/index.ts",
        "server/db/**",
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "./shared"),
      "@": path.resolve(import.meta.dirname, "./client/src"),
    },
  },
});
