import { defineConfig, devices } from "@playwright/test";
import path from "path";

const dbPath = path.resolve("data/dev.db");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "serial",
      testDir: "./e2e/serial",
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "parallel",
      testDir: "./e2e/parallel",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // db:seed always resets rate-limit config and clears bans/violations
    // to prevent parallel workers from self-banning localhost.
    // See docs/architecture/conventions.md — "E2E Testing Pitfalls".
    command:
      "rm -f data/dev.db && npm run db:seed && npm run build && " +
      "cp -r .next/static .next/standalone/.next/ && " +
      "node .next/standalone/server.js",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      DATABASE_URL: `file:${dbPath}`,
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD: "admin",
      SESSION_SECRET: "super-secret-secret-at-least-32chars",
      PORT: "3000",
      HOSTNAME: "localhost",
    },
  },
});
