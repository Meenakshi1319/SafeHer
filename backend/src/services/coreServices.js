/**
 * SafeHer — Core business-logic services
 *
 * Pure logic — no Express req/res here. Controllers call these functions.
 */

const path = require("path");
const fs   = require("fs");
const { db, bucket, twilioClient, TWILIO_PHONE } = require("../config/dependencies");

// ═══════════════════════════════════════════════════════════════════════════
// SESSION STORE
// ═══════════════════════════════════════════════════════════════════════════

const activeSessions  = {};
const sessionLastSeen = {};

function getSession(uid) {
  if (!activeSessions[uid]) {
    activeSessions[uid] = { riskScore: 0, alerts: [], socketId: null, stealthMode: false };
  }
  sessionLastSeen[uid] = Date.now();
  return activeSessions[uid];
}

// Auto-cleanup stale sessions every 10 minutes (skip in test mode)
if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const now = Date.now();
    const ttlMs = 60 * 60 * 1000;
    Object.keys(activeSessions).forEach((uid) => {
      if (now - (sessionLastSeen[uid] || 0) > ttlMs) {
        delete activeSessions[uid];
        delete sessionLastSeen[uid];
      }
    });
  }, 10 * 60 * 1000);
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK LEVELS
// ═══════════════════════════════════════════════════════════════════════════

const RISK_LEVELS = {
  LOW:       { min: 0,  max: 30,  label: "LOW",       emoji: "🟢" },
  MEDIUM:    { min: 31, max: 60,  label: "MEDIUM",     emoji: "🟡" },
  HIGH:      { min: 61, max: 85,  label: "HIGH",       emoji: "🟠" },
  VERY_HIGH: { min: 86, max: 100, label: "VERY HIGH",  emoji: "🔴" },
};

function getRiskLevel(score) {
  if (score <= 30) return RISK_LEVELS.LOW;
  if (score <= 60) return RISK_LEVELS.MEDIUM;
  if (score <= 85) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.VERY_HIGH;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGGER
// ═══════════════════════════════════════════════════════════════════════════

function logEvent(tag, message, data = {}) {
  const entry = { timestamp: new Date().toISOString(), tag, message, ...data };
  console.log(`[${entry.timestamp}] [${tag}]`, message, data);

  const date    = new Date().toISOString().split("T")[0];
  const logPath = path.join(__dirname, "..", "logs", `${date}.log`);
  fs.promises.appendFile(logPath, JSON.stringify(entry) + "\n").catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function generateLocationLink(lat, lng) {
  if (!lat || !lng) return "Location unavailable";
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

async function sendSMS(to, message) {
  try {
    logEvent("INFO", "📱 [SMS] Attempting to send SMS", { to, messageLength: message.length });
    
    if (!twilioClient) {
      logEvent("ERROR", "❌ [SMS] Twilio client not initialized");
      throw new Error("Twilio client not initialized");
    }
    
    if (!TWILIO_PHONE) {
      logEvent("ERROR", "❌ [SMS] TWILIO_PHONE not configured");
      throw new Error("TWILIO_PHONE not configured");
    }
    
    logEvent("INFO", "📤 [SMS] Sending via Twilio", { from: TWILIO_PHONE, to });
    
    const result = await twilioClient.messages.create({ body: message, from: TWILIO_PHONE, to });
    
    logEvent("SMS", `✅ Sent to ${to}`);
    logEvent("INFO", "✅ [SMS] SMS sent successfully", { 
      to, 
      sid: result.sid,
      status: result.status
    });
  } catch (err) {
    logEvent("ERROR", `❌ SMS failed to ${to}`, { error: err.message, code: err.code, moreInfo: err.moreInfo });
    logEvent("ERROR", "❌ [SMS] Detailed error", { 
      to,
      errorMessage: err.message,
      errorCode: err.code,
      errorStatus: err.status,
      errorDetails: err.moreInfo
    });
  }
}

async function saveAlert(uid, message, riskScore = 0, source = "system") {
  if (!db) return;
  const session = activeSessions[uid] || getSession(uid);
  
  // Stealth mode camouflage: if active, don't show "Emergency" in history
  const finalMessage = (session.stealthMode && source === "emergency") 
    ? `System Background Sync (${riskScore})`
    : message;

  await db.collection("users").doc(uid).collection("alerts").add({
    message: finalMessage, riskScore, source, seen: false, createdAt: new Date(),
  });
  logEvent("ALERT", `Stored for ${uid}`, { message: finalMessage, riskScore, source });
}

async function saveRiskHistory(uid, newScore, delta, reason, source) {
  if (!db) return;
  await db.collection("users").doc(uid).collection("riskHistory").add({
    score: newScore, delta, reason, source, createdAt: new Date(),
  });
}

async function saveSensorEvent(uid, type, value, riskAdded) {
  if (!db) return;
  await db.collection("users").doc(uid).collection("sensorEvents").add({
    type, value, riskAdded, createdAt: new Date(),
  });
  logEvent("SENSOR", `${type} stored for ${uid}`, { value, riskAdded });
}

async function getContacts(uid) {
  if (!db) return [];
  const snap = await db.collection("users").doc(uid).collection("contacts").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function filterContactsByType(contacts, allowedTypes) {
  return contacts.filter((c) => allowedTypes.includes(c.type));
}

// ═══════════════════════════════════════════════════════════════════════════
// SMS DISPATCH (tiered by risk level)
// ═══════════════════════════════════════════════════════════════════════════

async function dispatchByRiskLevel(uid, riskLevel, reason, score, location) {
  logEvent("INFO", "📤 [SMS] dispatchByRiskLevel called", { 
    uid, 
    riskLevel: riskLevel.label, 
    reason, 
    score,
    location 
  });

  if (riskLevel.label === "LOW") {
    logEvent("INFO", "⚠️ [SMS] Risk level is LOW - no SMS dispatch");
    return;
  }

  const contacts     = await getContacts(uid);
  logEvent("INFO", "📋 [SMS] Fetched contacts", { 
    uid, 
    totalContacts: contacts.length,
    contactTypes: contacts.map(c => c.type)
  });

  const locationLink = generateLocationLink(location?.lat, location?.lng);

  let allowedTypes = [];
  switch (riskLevel.label) {
    case "MEDIUM":    allowedTypes = ["family", "trusted"]; break;
    case "HIGH":      allowedTypes = ["family", "trusted", "volunteer", "ngo"]; break;
    case "VERY HIGH": allowedTypes = ["family", "trusted", "volunteer", "ngo", "police", "emergency"]; break;
  }

  logEvent("INFO", "🎯 [SMS] Allowed contact types for risk level", { 
    riskLevel: riskLevel.label, 
    allowedTypes 
  });

  const targets = filterContactsByType(contacts, allowedTypes);
  logEvent("INFO", "👥 [SMS] Filtered target contacts", { 
    totalTargets: targets.length,
    targetNames: targets.map(c => c.name),
    targetPhones: targets.map(c => c.phone)
  });

  if (targets.length === 0) {
    logEvent("WARN", `⚠️ [SMS] No contacts of types [${allowedTypes}] found for ${uid}`);
    logEvent("DISPATCH", `No contacts of types [${allowedTypes}] found for ${uid}`);
    return;
  }

  const session = getSession(uid);
  const smsBody = session.stealthMode
    ? `🤫 SAFEHER STEALTH ALERT\nUser is in a decoy mode. DO NOT call them back! Monitor silently.\nRisk: ${riskLevel.label} (${score}/100)\nLoc: ${locationLink}`
    : `${riskLevel.emoji} SAFEHER ALERT\nRisk Level : ${riskLevel.label} (${score}/100)\nReason     : ${reason}\nLocation   : ${locationLink}\nPlease respond immediately!`;

  logEvent("INFO", "📝 [SMS] SMS message prepared", { 
    messageLength: smsBody.length,
    stealthMode: session.stealthMode,
    preview: smsBody.substring(0, 50) + '...'
  });

  logEvent("INFO", "📤 [SMS] Sending SMS to targets...", { count: targets.length });
  
  const results = await Promise.allSettled(targets.map((c) => sendSMS(c.phone, smsBody)));
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  logEvent("INFO", "✅ [SMS] SMS dispatch complete", { 
    total: targets.length,
    successful,
    failed
  });

  logEvent("DISPATCH", `SMS sent to ${targets.length} contacts`, { uid, riskLevel: riskLevel.label, types: allowedTypes, stealthMode: session.stealthMode });
}

// ═══════════════════════════════════════════════════════════════════════════
// EMERGENCY TRIGGER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Full emergency handler. Requires `io` (Socket.io) to be passed in by the
 * controller/server so this service stays transport-agnostic.
 */
async function triggerEmergency(uid, reason, score, location, io) {
  logEvent("INFO", "🚨 [EMERGENCY] triggerEmergency called", { 
    uid, 
    reason, 
    score, 
    location 
  });

  const riskLevel = getRiskLevel(score);
  logEvent("INFO", "📊 [EMERGENCY] Risk level calculated", { 
    score, 
    riskLevel: riskLevel.label,
    emoji: riskLevel.emoji
  });

  await saveAlert(uid, `🚨 Emergency: ${reason}`, score, "emergency");

  if (db) {
    await db.collection("globalAlerts").add({
      uid, reason, riskScore: score, riskLevel: riskLevel.label,
      latitude: location?.lat || location?.latitude || null, 
      longitude: location?.lng || location?.longitude || null,
      timestamp: new Date(),
    });
    logEvent("INFO", "💾 [EMERGENCY] Global alert saved to Firestore");
  }

  logEvent("INFO", "📤 [EMERGENCY] Calling dispatchByRiskLevel...");
  await dispatchByRiskLevel(uid, riskLevel, reason, score, location);

  io.to(`user:${uid}`).emit("sos_alert", { uid, reason, score, riskLevel: riskLevel.label, emoji: riskLevel.emoji, location, timestamp: new Date() });
  io.to("admin").emit("sos_alert",       { uid, reason, score, riskLevel: riskLevel.label, emoji: riskLevel.emoji, location, timestamp: new Date() });

  if (score >= 61) {
    io.to(`user:${uid}`).emit("start_recording", { uid, reason, score });
    io.to("admin").emit("start_recording", { uid, reason, score });
  }

  logEvent("EMERGENCY", `Triggered for ${uid}`, { reason, score, riskLevel: riskLevel.label });
  logEvent("INFO", "✅ [EMERGENCY] triggerEmergency complete");
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK SCORE UPDATER
// ═══════════════════════════════════════════════════════════════════════════

async function applyRiskDelta(uid, delta, reason, source, location, io) {
  const session     = getSession(uid);
  session.riskScore = Math.min(session.riskScore + delta, 100);
  const score       = session.riskScore;
  const riskLevel   = getRiskLevel(score);

  await saveRiskHistory(uid, score, delta, reason, source);
  logEvent("RISK", `+${delta} for ${uid}`, { score, reason, riskLevel: riskLevel.label });

  io.to(`user:${uid}`).emit("risk_update", { uid, score, riskLevel: riskLevel.label, emoji: riskLevel.emoji, reason });
  io.to("admin").emit("risk_update",       { uid, score, riskLevel: riskLevel.label, emoji: riskLevel.emoji, reason });

  if (score > 30) {
    await triggerEmergency(uid, reason, score, location, io);
  }

  return { score, riskLevel };
}

module.exports = {
  // Session
  activeSessions, getSession,
  // Risk
  RISK_LEVELS, getRiskLevel, applyRiskDelta,
  // Logging
  logEvent,
  // Helpers
  generateLocationLink, sendSMS, saveAlert, saveRiskHistory,
  saveSensorEvent, getContacts, filterContactsByType,
  dispatchByRiskLevel, triggerEmergency,
};
