import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      reporter: ["text-summary", "html"],
      // Report on the logic worth protecting, not generated types or shadcn
      // primitives, so the percentage reflects something actionable.
      include: ["src/lib/**", "src/types/tasks.ts", "src/hooks/**"],
      exclude: ["src/components/ui/**", "src/integrations/**", "**/*.test.*"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
