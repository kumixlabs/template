import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["test"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
    },
  },
});
