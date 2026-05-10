/**
 * API tests for GET /health endpoint
 */

require("../setup");
const request = require("supertest");
const { app } = require("../../server");

describe("GET /health", () => {
  test("returns 200 with status and uptime", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toContain("SafeHer Backend is running");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("activeSessions");
  });

  test("uptime is a string ending with 's'", async () => {
    const res = await request(app).get("/health");
    expect(res.body.uptime).toMatch(/^\d+s$/);
  });

  test("timestamp is a valid ISO date string", async () => {
    const res = await request(app).get("/health");
    const date = new Date(res.body.timestamp);
    expect(date.toISOString()).toBe(res.body.timestamp);
  });
});
