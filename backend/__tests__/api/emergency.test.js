/**
 * API tests for emergency/SOS routes
 *
 * POST /trigger-sos
 * POST /smart-emergency
 */

require("../setup");
const request = require("supertest");
const { app, activeSessions } = require("../../server");

describe("Emergency Routes", () => {
  beforeEach(() => {
    Object.keys(activeSessions).forEach((k) => delete activeSessions[k]);
  });

  test("POST /trigger-sos triggers full SOS", async () => {
    const res = await request(app).post("/trigger-sos").send({
      uid: "sos-1", reason: "Manual SOS", riskScore: 100,
      location: { lat: 17.385, lng: 78.487 },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("SOS Triggered Successfully");
    expect(res.body.alertLevel).toBe("VERY HIGH");
    expect(res.body.startRecording).toBe(true);
    expect(res.body.vibration).toBe(true);
  });

  test("POST /trigger-sos with low risk score", async () => {
    const res = await request(app).post("/trigger-sos").send({
      uid: "sos-2", reason: "Low SOS", riskScore: 20,
    });
    expect(res.status).toBe(200);
    expect(res.body.alertLevel).toBe("LOW");
    expect(res.body.startRecording).toBe(false);
    // LOW risk SOS should still succeed but not dispatch external alerts
    expect(res.body.success).toBe(true);
    expect(res.body.vibration).toBe(true);
  });

  test("POST /trigger-sos returns 400 when uid is missing", async () => {
    const res = await request(app).post("/trigger-sos").send({ reason: "test", riskScore: 100 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /smart-emergency with voice trigger", async () => {
    const res = await request(app).post("/smart-emergency").send({
      uid: "smart-1", voice: "Help me please!", soundLevel: -100, shake: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.riskScore).toBe(40);
  });

  test("POST /smart-emergency with all sensors", async () => {
    const res = await request(app).post("/smart-emergency").send({
      uid: "smart-2", voice: "Help me!", soundLevel: 0, shake: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.riskScore).toBe(85); // 40 + 25 + 20
  });

  test("POST /smart-emergency with no risk detected", async () => {
    const res = await request(app).post("/smart-emergency").send({
      uid: "smart-3", voice: "", soundLevel: -100, shake: false,
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("No risk detected");
  });

  test("POST /smart-emergency returns 400 when uid is missing", async () => {
    const res = await request(app).post("/smart-emergency").send({ voice: "Help me!" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
