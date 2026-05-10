/**
 * API tests for authentication routes
 *
 * POST /signup
 * POST /login
 * POST /logout
 * POST /verify-phone-login
 * GET  /user/:uid
 */

require("../setup");
const request = require("supertest");
const { app } = require("../../server");

describe("Auth Routes", () => {
  // ─── POST /signup ────────────────────────────────────────────────────

  describe("POST /signup", () => {
    test("creates a user profile successfully", async () => {
      const res = await request(app).post("/signup").send({
        uid: "test-signup-uid",
        name: "Test User",
        email: "test@safeher.com",
        phone: "+911234567890",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Profile Created Successfully");
      expect(res.body.uid).toBe("test-signup-uid");
    });

    test("creates profile with emergency contacts", async () => {
      const res = await request(app).post("/signup").send({
        uid: "test-signup-uid-2",
        name: "User With Contacts",
        email: "contacts@safeher.com",
        emergencyContacts: [
          { name: "Mom", phone: "+911111111111", type: "family" },
          { name: "Dad", phone: "+912222222222", type: "family" },
        ],
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("returns 400 when required fields are missing", async () => {
      const res = await request(app).post("/signup").send({
        uid: "test-uid",
        // missing name and email
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test("returns 400 when uid is missing", async () => {
      const res = await request(app).post("/signup").send({
        name: "No UID",
        email: "nouid@test.com",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── POST /login ────────────────────────────────────────────────────

  describe("POST /login", () => {
    test("verifies a valid Firebase ID token", async () => {
      const res = await request(app).post("/login").send({
        idToken: "mock-valid-firebase-token",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Login Successful");
      expect(res.body).toHaveProperty("uid");
      expect(res.body).toHaveProperty("email");
    });
  });

  // ─── POST /logout ───────────────────────────────────────────────────

  describe("POST /logout", () => {
    test("revokes refresh tokens for a user", async () => {
      const res = await request(app).post("/logout").send({
        uid: "test-logout-uid",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Logged out successfully");
    });
  });

  // ─── POST /verify-phone-login ───────────────────────────────────────

  describe("POST /verify-phone-login", () => {
    test("verifies phone auth token", async () => {
      const res = await request(app).post("/verify-phone-login").send({
        idToken: "mock-phone-token",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Phone Verified Successfully");
      expect(res.body).toHaveProperty("uid");
      expect(res.body).toHaveProperty("phone");
    });
  });

  // ─── GET /user/:uid ─────────────────────────────────────────────────

  describe("GET /user/:uid", () => {
    test("returns user profile when found", async () => {
      const res = await request(app).get("/user/test-uid-123");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toHaveProperty("uid");
    });
  });
});
