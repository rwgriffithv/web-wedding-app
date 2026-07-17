import { test, expect } from "@playwright/test";

test("health endpoint returns ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.database).toBe("connected");
});
