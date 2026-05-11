/**
 * WebSocket event handlers (Socket.io)
 */
const { admin } = require('../../config/dependencies');
const { getSession, getRiskLevel, activeSessions, logEvent } = require('../../services/coreServices');
const sessionLastSeen = require('../../services/coreServices').activeSessions; // shares same ref

module.exports = function setupWebSocket(io) {
  io.on("connection", (socket) => {
    logEvent("SOCKET", `Connected: ${socket.id}`);

    socket.on("register", async ({ uid, token }) => {
      try {
        if (!token || !admin.apps.length) return;
        const decoded = await admin.auth().verifyIdToken(token, true);
        const isAdmin = decoded.admin === true;
        if (decoded.uid !== uid && !isAdmin) {
          socket.emit("auth_error", { message: "Forbidden" });
          return;
        }

        const session = getSession(uid);
        session.socketId = socket.id;
        socket.data.uid = uid;

        socket.join(`user:${uid}`);
        if (isAdmin) socket.join("admin");

        logEvent("SOCKET", `Registered uid: ${uid}`, { socketId: socket.id, admin: isAdmin });

        socket.emit("risk_sync", {
          uid,
          riskScore: session.riskScore,
          riskLevel: getRiskLevel(session.riskScore).label,
          emoji: getRiskLevel(session.riskScore).emoji,
        });
      } catch (error) {
        socket.emit("auth_error", { message: "Invalid token" });
      }
    });

    socket.on("disconnect", () => {
      const uid = socket.data.uid;
      if (uid && activeSessions[uid]) {
        activeSessions[uid].socketId = null;
      }
      logEvent("SOCKET", `Disconnected: ${socket.id}`);
    });
  });
};
