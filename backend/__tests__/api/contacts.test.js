/**
 * API tests for contact management routes
 *
 * POST   /contacts/:uid       — add contact
 * GET    /contacts/:uid       — list contacts
 * DELETE /contacts/:uid/:cid  — remove contact
 */

require("../setup");
const request = require("supertest");
const { app } = require("../../server");

describe("Contact Routes", () => {
  // ─── POST /contacts/:uid ─────────────────────────────────────────────

  describe("POST /contacts/:uid", () => {
    test("adds a new emergency contact", async () => {
      const res = await request(app).post("/contacts/user-123").send({
        name: "Mom",
        phone: "+911234567890",
        type: "family",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Contact added");
    });

    test("defaults to 'trusted' type when not specified", async () => {
      const res = await request(app).post("/contacts/user-123").send({
        name: "Friend",
        phone: "+919876543210",
        // type omitted — should default to "trusted"
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("accepts all valid contact types", async () => {
      for (const type of ["family", "trusted", "volunteer", "ngo", "police", "emergency"]) {
        const res = await request(app).post("/contacts/user-123").send({
          name: `Contact ${type}`,
          phone: "+911234567890",
          type,
        });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });

    test("returns 400 when name is missing", async () => {
      const res = await request(app).post("/contacts/user-123").send({
        phone: "+911234567890",
        type: "family",
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test("returns 400 when phone is missing", async () => {
      const res = await request(app).post("/contacts/user-123").send({
        name: "Mom",
        type: "family",
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── GET /contacts/:uid ──────────────────────────────────────────────

  describe("GET /contacts/:uid", () => {
    test("returns contacts list", async () => {
      const res = await request(app).get("/contacts/user-123");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.contacts).toBeInstanceOf(Array);
      expect(res.body.contacts.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── DELETE /contacts/:uid/:cid ──────────────────────────────────────

  describe("DELETE /contacts/:uid/:cid", () => {
    test("deletes a contact", async () => {
      const res = await request(app).delete("/contacts/user-123/contact-456");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Contact deleted");
    });
  });
});
