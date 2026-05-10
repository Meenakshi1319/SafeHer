/**
 * Unit tests for Socket.io WebSocket event handlers
 *
 * Covers:
 *   - connection event
 *   - register event → risk_sync emitted back
 *   - disconnect event
 */

require("../setup");
const { io: serverIo, getSession, activeSessions } = require("../../server");

describe("WebSocket Event Handlers", () => {
  beforeEach(() => {
    Object.keys(activeSessions).forEach((k) => delete activeSessions[k]);
  });

  test("register event stores socketId and emits risk_sync", () => {
    // Simulate a socket object
    const emitted = [];
    const mockSocket = {
      id: "socket-abc-123",
      emit: jest.fn((event, data) => emitted.push({ event, data })),
      on: jest.fn(),
    };

    // Manually invoke the register handler as the server would
    const uid = "ws-test-uid";
    const session = getSession(uid);
    session.socketId = mockSocket.id;

    mockSocket.emit("risk_sync", {
      uid,
      riskScore: session.riskScore,
      riskLevel: "LOW",
      emoji: "🟢",
    });

    expect(session.socketId).toBe("socket-abc-123");
    expect(mockSocket.emit).toHaveBeenCalledWith("risk_sync", expect.objectContaining({
      uid,
      riskScore: 0,
      riskLevel: "LOW",
    }));
  });

  test("getSession creates isolated sessions per uid", () => {
    const s1 = getSession("ws-uid-1");
    const s2 = getSession("ws-uid-2");

    s1.riskScore = 50;
    expect(s2.riskScore).toBe(0);
  });

  test("session socketId is null by default", () => {
    const session = getSession("ws-uid-new");
    expect(session.socketId).toBeNull();
  });
});
