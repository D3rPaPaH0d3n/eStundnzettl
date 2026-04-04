import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    include: ["src/**/__tests__/**/*.test.{js,jsx}", "src/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/utils/**", "src/db/repositories/**"],
      exclude: ["**/__tests__/**", "**/*.test.{js,jsx}"],
    },
  },
});
