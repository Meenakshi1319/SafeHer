/**
 * API tests for AI chatbot route
 *
 * POST /ai/chat
 */

require("../setup");
const request = require("supertest");
const { app } = require("../../server");

describe("AI Chat Route", () => {
  test("POST /ai/chat returns AI-generated reply", async () => {
    const res = await request(app).post("/ai/chat").send({
      message: "I feel unsafe walking home",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("reply");
    expect(typeof res.body.reply).toBe("string");
    expect(res.body.reply.length).toBeGreaterThan(0);
  });

  test("POST /ai/chat returns 400 for empty message", async () => {
    const res = await request(app).post("/ai/chat").send({
      message: "",
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /ai/chat returns 400 for whitespace-only message", async () => {
    const res = await request(app).post("/ai/chat").send({
      message: "   ",
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /ai/chat accepts conversation history", async () => {
    const res = await request(app).post("/ai/chat").send({
      message: "What else can I do?",
      history: [
        { role: "user", text: "I feel unsafe" },
        { role: "model", text: "Press SOS if in danger." },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
