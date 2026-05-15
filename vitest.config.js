import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/__tests__/**/*.test.{js,jsx,ts,tsx}", "src/**/*.test.{js,jsx,ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "lcov"],
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      exclude: [
        "**/__tests__/**",
        "**/*.test.{js,jsx,ts,tsx}",
        "**/*.d.ts",
        "**/*.json",
        "src/test/**",
        "src/**/*.md",
        "src/**/*.css",
        "src/types/**",
        "src/locales/**",
        "src/i18n/locales/**",
        "src/i18n/TRANSLATION_STATUS.md",
      ],
    },
  },
});
