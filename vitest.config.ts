import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
    env: {
      ADMIN_USERNAME: "test-admin",
      ADMIN_PASSWORD: "test-admin-pass",
      SESSION_SECRET: "test-secret-key-not-for-production",
      RATE_LIMIT_MAX: "100",
      RATE_LIMIT_WINDOW_MS: "60000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
