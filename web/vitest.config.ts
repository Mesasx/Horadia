import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  // The engine tests never touch CSS; stop Vite loading the Tailwind PostCSS
  // config (which only makes sense inside Next's build).
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Horadia reasons in Europe/Madrid; pin it so date maths is deterministic
    // regardless of the machine / CI timezone.
    env: { TZ: "Europe/Madrid" },
  },
});
