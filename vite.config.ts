import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative asset paths, so the build works under /Phatafat/ on GitHub
  // Pages as well as at the root of any other static host.
  base: "./",
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
