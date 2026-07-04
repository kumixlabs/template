import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each folder in `packages/*` is treated as a separate Vitest project.
    // See https://vitest.dev/guide/projects
    projects: ["packages/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
    },
  },
});
