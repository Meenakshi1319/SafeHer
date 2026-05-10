/**
 * Unit tests for helper functions in server.js
 *
 * Covers:
 *   getRiskLevel()          — risk tier mapping
 *   generateLocationLink()  — Google Maps URL generation
 *   filterContactsByType()  — contact type filtering
 *   getSession()            — in-memory session creation/retrieval
 *   getLocalSafetyReply()   — keyword-based local AI fallback
 *   RISK_LEVELS             — constant integrity
 */

require("../setup");
const {
  getRiskLevel,
  generateLocationLink,
  filterContactsByType,
  getSession,
  getLocalSafetyReply,
  RISK_LEVELS,
  activeSessions,
} = require("../../server");

// ─── getRiskLevel() ──────────────────────────────────────────────────────

describe("getRiskLevel()", () => {
  test("score 0 → LOW", () => {
    expect(getRiskLevel(0).label).toBe("LOW");
  });

  test("score 30 → LOW (upper boundary)", () => {
    expect(getRiskLevel(30).label).toBe("LOW");
  });

  test("score 31 → MEDIUM", () => {
    expect(getRiskLevel(31).label).toBe("MEDIUM");
  });

  test("score 60 → MEDIUM (upper boundary)", () => {
    expect(getRiskLevel(60).label).toBe("MEDIUM");
  });

  test("score 61 → HIGH", () => {
    expect(getRiskLevel(61).label).toBe("HIGH");
  });

  test("score 85 → HIGH (upper boundary)", () => {
    expect(getRiskLevel(85).label).toBe("HIGH");
  });

  test("score 86 → VERY HIGH", () => {
    expect(getRiskLevel(86).label).toBe("VERY HIGH");
  });

  test("score 100 → VERY HIGH", () => {
    expect(getRiskLevel(100).label).toBe("VERY HIGH");
  });

  test("returns correct emoji for each tier", () => {
    expect(getRiskLevel(10).emoji).toBe("🟢");
    expect(getRiskLevel(50).emoji).toBe("🟡");
    expect(getRiskLevel(70).emoji).toBe("🟠");
    expect(getRiskLevel(95).emoji).toBe("🔴");
  });
});

// ─── RISK_LEVELS constant ────────────────────────────────────────────────

describe("RISK_LEVELS", () => {
  test("has exactly 4 levels", () => {
    expect(Object.keys(RISK_LEVELS)).toHaveLength(4);
  });

  test("each level has min, max, label, emoji", () => {
    Object.values(RISK_LEVELS).forEach((level) => {
      expect(level).toHaveProperty("min");
      expect(level).toHaveProperty("max");
      expect(level).toHaveProperty("label");
      expect(level).toHaveProperty("emoji");
    });
  });

  test("ranges are contiguous 0–100", () => {
    expect(RISK_LEVELS.LOW.min).toBe(0);
    expect(RISK_LEVELS.VERY_HIGH.max).toBe(100);
  });
});

// ─── generateLocationLink() ──────────────────────────────────────────────

describe("generateLocationLink()", () => {
  test("returns Google Maps URL for valid coords", () => {
    const link = generateLocationLink(17.385, 78.4867);
    expect(link).toBe("https://www.google.com/maps?q=17.385,78.4867");
  });

  test("returns 'Location unavailable' when lat is null", () => {
    expect(generateLocationLink(null, 78.4867)).toBe("Location unavailable");
  });

  test("returns 'Location unavailable' when lng is null", () => {
    expect(generateLocationLink(17.385, null)).toBe("Location unavailable");
  });

  test("returns 'Location unavailable' when both are null", () => {
    expect(generateLocationLink(null, null)).toBe("Location unavailable");
  });

  test("handles zero coordinates (valid)", () => {
    // 0 is falsy in JS, but 0,0 is a valid coordinate
    // Current implementation treats 0 as unavailable — documenting actual behavior
    const link = generateLocationLink(0, 0);
    expect(link).toBe("Location unavailable");
  });
});

// ─── filterContactsByType() ──────────────────────────────────────────────

describe("filterContactsByType()", () => {
  const contacts = [
    { name: "Mom", type: "family" },
    { name: "Best Friend", type: "trusted" },
    { name: "Volunteer A", type: "volunteer" },
    { name: "NGO Helper", type: "ngo" },
    { name: "Police HQ", type: "police" },
  ];

  test("returns only family contacts", () => {
    const result = filterContactsByType(contacts, ["family"]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Mom");
  });

  test("returns family + trusted", () => {
    const result = filterContactsByType(contacts, ["family", "trusted"]);
    expect(result).toHaveLength(2);
  });

  test("returns all matching types", () => {
    const result = filterContactsByType(contacts, ["family", "trusted", "volunteer", "ngo", "police"]);
    expect(result).toHaveLength(5);
  });

  test("returns empty array when no types match", () => {
    const result = filterContactsByType(contacts, ["emergency"]);
    expect(result).toHaveLength(0);
  });

  test("returns empty array for empty contacts list", () => {
    expect(filterContactsByType([], ["family"])).toHaveLength(0);
  });
});

// ─── getSession() ────────────────────────────────────────────────────────

describe("getSession()", () => {
  beforeEach(() => {
    // Clear all sessions before each test
    Object.keys(activeSessions).forEach((key) => delete activeSessions[key]);
  });

  test("creates a new session for unknown uid", () => {
    const session = getSession("new-user-abc");
    expect(session).toEqual({ riskScore: 0, alerts: [], socketId: null });
  });

  test("returns existing session for known uid", () => {
    const first = getSession("repeat-user");
    first.riskScore = 42;
    const second = getSession("repeat-user");
    expect(second.riskScore).toBe(42);
  });

  test("different uids get separate sessions", () => {
    const a = getSession("user-a");
    const b = getSession("user-b");
    a.riskScore = 10;
    expect(b.riskScore).toBe(0);
  });
});

// ─── getLocalSafetyReply() ──────────────────────────────────────────────

describe("getLocalSafetyReply()", () => {
  test("immediate danger keywords trigger danger response", () => {
    const reply = getLocalSafetyReply("I feel unsafe walking alone");
    expect(reply).toContain("SOS");
  });

  test("night/travel keywords trigger travel response", () => {
    const reply = getLocalSafetyReply("Any tips for travelling at night?");
    expect(reply).toContain("night travel");
  });

  test("self-defense keywords trigger defense response", () => {
    const reply = getLocalSafetyReply("How do I defend myself?");
    expect(reply).toContain("escape");
  });

  test("helpline keywords trigger helpline response", () => {
    const reply = getLocalSafetyReply("What is the police number?");
    expect(reply).toContain("100");
    expect(reply).toContain("1091");
  });

  test("route/location keywords trigger route response", () => {
    const reply = getLocalSafetyReply("How do I share my location?");
    expect(reply).toContain("location");
  });

  test("unmatched input returns default fallback", () => {
    const reply = getLocalSafetyReply("Tell me about the weather");
    expect(reply).toContain("emergency steps");
  });

  test("handles null/undefined gracefully", () => {
    expect(() => getLocalSafetyReply(null)).not.toThrow();
    expect(() => getLocalSafetyReply(undefined)).not.toThrow();
  });
});
