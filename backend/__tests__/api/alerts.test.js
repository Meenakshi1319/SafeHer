/**
 * API tests for alert routes
 *
 * GET  /alerts/:uid
 * POST /alerts/:uid/seen/:aid
 * GET  /session/:uid
 */

require("../setup");
const request = require("supertest");
const { app } = require("../../server");

describe("Alert & Session Routes", () => {
  test("GET /alerts/:uid returns alerts array", async () => {
    const res = await request(app).get("/alerts/user-1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("POST /alerts/:uid/seen/:aid marks alert as seen", async () => {
    const res = await request(app).post("/alerts/user-1/seen/alert-1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Alert marked as seen");
  });

  test("GET /session/:uid returns session data", async () => {
    const res = await request(app).get("/session/user-1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("riskScore");
    expect(res.body).toHaveProperty("riskLevel");
    expect(res.body).toHaveProperty("alerts");
  });
});
