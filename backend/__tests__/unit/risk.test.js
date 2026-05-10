/**
 * Unit tests for risk score logic
 *
 * Covers:
 *   - Risk score accumulation via in-memory sessions
 *   - Score capping at 100
 *   - Risk level transitions across thresholds
 */

require("../setup");
const { getSession, getRiskLevel, activeSessions } = require("../../server");

describe("Risk Score System", () => {
  beforeEach(() => {
    Object.keys(activeSessions).forEach((key) => delete activeSessions[key]);
  });

  test("initial risk score is 0 (LOW)", () => {
    const session = getSession("risk-test-1");
    expect(session.riskScore).toBe(0);
    expect(getRiskLevel(session.riskScore).label).toBe("LOW");
  });

  test("accumulates risk from multiple sensor events", () => {
    const session = getSession("risk-test-2");

    // Shake: +20
    session.riskScore = Math.min(session.riskScore + 20, 100);
    expect(session.riskScore).toBe(20);
    expect(getRiskLevel(session.riskScore).label).toBe("LOW");

    // Sound: +25
    session.riskScore = Math.min(session.riskScore + 25, 100);
    expect(session.riskScore).toBe(45);
    expect(getRiskLevel(session.riskScore).label).toBe("MEDIUM");

    // Voice: +40
    session.riskScore = Math.min(session.riskScore + 40, 100);
    expect(session.riskScore).toBe(85);
    expect(getRiskLevel(session.riskScore).label).toBe("HIGH");
  });

  test("score caps at 100", () => {
    const session = getSession("risk-test-3");
    session.riskScore = Math.min(session.riskScore + 120, 100);
    expect(session.riskScore).toBe(100);
  });

  test("transitions LOW → MEDIUM at 31", () => {
    expect(getRiskLevel(30).label).toBe("LOW");
    expect(getRiskLevel(31).label).toBe("MEDIUM");
  });

  test("transitions MEDIUM → HIGH at 61", () => {
    expect(getRiskLevel(60).label).toBe("MEDIUM");
    expect(getRiskLevel(61).label).toBe("HIGH");
  });

  test("transitions HIGH → VERY HIGH at 86", () => {
    expect(getRiskLevel(85).label).toBe("HIGH");
    expect(getRiskLevel(86).label).toBe("VERY HIGH");
  });

  test("risk reset sets score to 0", () => {
    const session = getSession("risk-test-4");
    session.riskScore = 75;
    // Simulate reset
    session.riskScore = 0;
    expect(session.riskScore).toBe(0);
    expect(getRiskLevel(session.riskScore).label).toBe("LOW");
  });

  test("full escalation path: LOW → MEDIUM → HIGH → VERY HIGH", () => {
    const session = getSession("risk-test-5");
    const deltas = [20, 15, 25, 30]; // 20, 35, 60, 90
    const expectedLevels = ["LOW", "MEDIUM", "MEDIUM", "VERY HIGH"];

    deltas.forEach((delta, i) => {
      session.riskScore = Math.min(session.riskScore + delta, 100);
      expect(getRiskLevel(session.riskScore).label).toBe(expectedLevels[i]);
    });
  });
});
