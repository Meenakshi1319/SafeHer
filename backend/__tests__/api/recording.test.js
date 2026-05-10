/**
 * API tests for recording routes
 *
 * POST /recording/start
 * POST /recording/stop
 * GET  /recordings/:uid
 */

require("../setup");
const request = require("supertest");
const { app } = require("../../server");

describe("Recording Routes", () => {
  test("POST /recording/start logs start event", async () => {
    const res = await request(app).post("/recording/start").send({
      uid: "rec-1", reason: "High risk detected",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Recording start logged");
  });

  test("POST /recording/start returns 400 when uid is missing", async () => {
    const res = await request(app).post("/recording/start").send({ reason: "test" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /recording/stop logs stop event", async () => {
    const res = await request(app).post("/recording/stop").send({
      uid: "rec-1",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Recording stop logged");
  });

  test("POST /recording/stop returns 400 when uid is missing", async () => {
    const res = await request(app).post("/recording/stop").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("GET /recordings/:uid returns recordings list", async () => {
    const res = await request(app).get("/recordings/rec-1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recordings).toBeInstanceOf(Array);
  });
});
