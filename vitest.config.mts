import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "cloudflare:workers": fileURLToPath(
        new URL("./tests/helpers/cloudflare-workers.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
