/**
 * API tests for sensor routes
 *
 * POST /sensor/shake  — +20 pts
 * POST /sensor/sound  — +25 pts
 * POST /sensor/voice  — +40 pts
 */

require("../setup");
const request = require("supertest");
const { app, activeSessions } = require("../../server");

describe("Sensor Routes", () => {
  beforeEach(() => {
    Object.keys(activeSessions).forEach((k) => delete activeSessions[k]);
  });

  test("POST /sensor/shake adds 20 risk points", async () => {
    const res = await request(app).post("/sensor/shake").send({ uid: "s1" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Shake event processed");
    expect(res.body.riskScore).toBe(20);
  });

  test("POST /sensor/shake returns 400 when uid is missing", async () => {
    const res = await request(app).post("/sensor/shake").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /sensor/sound adds 25 risk points", async () => {
    const res = await request(app).post("/sensor/sound").send({
      uid: "s2", soundLevel: 85,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Sound event processed");
    expect(res.body.riskScore).toBe(25);
  });

  test("POST /sensor/sound returns 400 when uid is missing", async () => {
    const res = await request(app).post("/sensor/sound").send({ soundLevel: 85 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /sensor/voice adds 40 risk points", async () => {
    const res = await request(app).post("/sensor/voice").send({
      uid: "s3", transcript: "Help me!",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Voice event processed");
    expect(res.body.riskScore).toBe(40);
  });

  test("POST /sensor/voice returns 400 when uid is missing", async () => {
    const res = await request(app).post("/sensor/voice").send({ transcript: "Help me!" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("sensor events with location are processed", async () => {
    const res = await request(app).post("/sensor/shake").send({
      uid: "s4", location: { lat: 17.385, lng: 78.487 },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
