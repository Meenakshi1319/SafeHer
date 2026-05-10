/**
 * API tests for risk score routes
 *
 * POST /update-risk   — add risk delta
 * POST /reset-risk    — reset to 0
 * GET  /risk/:uid     — current score
 * GET  /risk/:uid/history — history list
 */

require("../setup");
const request = require("supertest");
const { app, activeSessions } = require("../../server");

describe("Risk Score Routes", () => {
  beforeEach(() => {
    Object.keys(activeSessions).forEach((k) => delete activeSessions[k]);
  });

  test("POST /update-risk returns updated score", async () => {
    const res = await request(app).post("/update-risk").send({
      uid: "r1", value: 20, reason: "test", source: "manual",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.riskScore).toBe(20);
    expect(res.body.riskLevel).toBe("LOW");
  });

  test("POST /update-risk returns 400 when uid is missing", async () => {
    const res = await request(app).post("/update-risk").send({ value: 20, reason: "test" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /reset-risk resets to 0", async () => {
    await request(app).post("/update-risk").send({ uid: "r2", value: 50, reason: "x" });
    const res = await request(app).post("/reset-risk").send({ uid: "r2" });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Risk Score Reset to 0");
  });

  test("POST /reset-risk returns 400 when uid is missing", async () => {
    const res = await request(app).post("/reset-risk").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("GET /risk/:uid returns current score", async () => {
    const res = await request(app).get("/risk/new-user");
    expect(res.status).toBe(200);
    expect(res.body.riskScore).toBe(0);
    expect(res.body.riskLevel).toBe("LOW");
  });

  test("GET /risk/:uid/history returns array", async () => {
    const res = await request(app).get("/risk/any/history");
    expect(res.status).toBe(200);
    expect(res.body.history).toBeInstanceOf(Array);
  });
});
