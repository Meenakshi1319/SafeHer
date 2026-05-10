/**
 * API tests for location routes
 *
 * POST /save-location
 * GET  /location/:uid
 */

require("../setup");
const request = require("supertest");
const { app } = require("../../server");

describe("Location Routes", () => {
  test("POST /save-location saves coordinates", async () => {
    const res = await request(app).post("/save-location").send({
      uid: "loc-1", latitude: 17.385, longitude: 78.4867,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Location Saved Successfully");
  });

  test("POST /save-location returns 400 when uid is missing", async () => {
    const res = await request(app).post("/save-location").send({
      latitude: 17.385, longitude: 78.4867,
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /save-location returns 400 when coordinates are missing", async () => {
    const res = await request(app).post("/save-location").send({ uid: "loc-1" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("GET /location/:uid returns success with mapsLink", async () => {
    const res = await request(app).get("/location/loc-1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("mapsLink");
  });
});
