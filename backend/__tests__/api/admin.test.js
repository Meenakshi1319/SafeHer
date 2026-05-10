/**
 * API tests for admin and 404-branch routes
 *
 * GET /alerts/admin/all       — global alerts (admin)
 * GET /user/:uid              — 404 when user not found
 * GET /location/:uid          — 404 when no location found
 */

require("../setup");
const request = require("supertest");
const { app } = require("../../server");

// Pull the mock so we can override it for 404 scenarios
const { mockFirestoreDoc, mockFirestoreCollection } = require("../setup");

describe("Admin & 404 Branch Routes", () => {
  // ─── GET /alerts/admin/all ───────────────────────────────────────────

  describe("GET /alerts/admin/all", () => {
    test("returns global alerts array", async () => {
      const res = await request(app).get("/alerts/admin/all");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty("alerts");
      expect(res.body.alerts).toBeInstanceOf(Array);
    });
  });

  // ─── GET /user/:uid — 404 branch ─────────────────────────────────────

  describe("GET /user/:uid — not found", () => {
    test("returns 404 when user document does not exist", async () => {
      // Temporarily override the doc.get mock to return exists: false
      const originalGet = mockFirestoreDoc.get;
      mockFirestoreDoc.get = jest.fn().mockResolvedValue({
        exists: false,
        id: "missing-uid",
        data: () => null,
      });

      const res = await request(app).get("/user/missing-uid");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("User not found");

      // Restore original mock
      mockFirestoreDoc.get = originalGet;
    });
  });

  // ─── GET /location/:uid — 404 branch ─────────────────────────────────

  describe("GET /location/:uid — not found", () => {
    test("returns 404 when no location exists for user", async () => {
      // Temporarily override the collection.get mock to return empty snapshot
      const originalGet = mockFirestoreCollection.get;
      mockFirestoreCollection.get = jest.fn().mockResolvedValue({
        empty: true,
        docs: [],
      });

      const res = await request(app).get("/location/no-location-uid");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("No location found");

      // Restore original mock
      mockFirestoreCollection.get = originalGet;
    });
  });
});
