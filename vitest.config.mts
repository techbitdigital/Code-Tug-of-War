import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Lets tests import with the same "@/..." paths as the app.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { include: ["lib/**/*.test.ts"] },
});
