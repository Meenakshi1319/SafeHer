/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                  SAFEHER — COMPLETE EMERGENCY BACKEND                   ║
 * ║                                                                          ║
 * ║  Stack  :  Node.js · Express · Socket.io · Firebase Admin · Twilio      ║
 * ║                                                                          ║
 * ║  Install:                                                                ║
 * ║    npm install express cors body-parser socket.io multer dotenv          ║
 * ║              twilio firebase-admin                                       ║
 * ║                                                                          ║
 * ║  Files needed in project root:                                           ║
 * ║    .env                  (all secrets — see BLOCK 2)                    ║
 * ║    serviceAccountKey.json (Firebase Admin private key)                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── HOW TO GET serviceAccountKey.json ───────────────────────────────────────
 *   Firebase Console → Project Settings → Service Accounts
 *   → Generate New Private Key → save as serviceAccountKey.json
 *
 * ── AI FILE → ENDPOINT COVERAGE MAP ────────────────────────────────────────
 *
 *  shEmergencyServAI.js   → POST /trigger-sos
 *  shRiskScoreAI.js       → POST /update-risk  · POST /reset-risk · GET /risk/:uid
 *  shShakeDetectorAI.js   → POST /sensor/shake
 *  shSoundDetectionAI.js  → POST /sensor/sound
 *  shVoiceTriggerAI.js    → POST /sensor/voice
 *  shAutoVideoRecAI.js    → POST /recording/start · POST /recording/stop
 *                           POST /upload-evidence · GET  /recordings/:uid
 *
 * ── FIRESTORE DATA MODEL ─────────────────────────────────────────────────────
 *
 *  users/{uid}
 *    name, email, phone, createdAt, lastLoginAt
 *    contacts/{cid}      name, phone, type, createdAt
 *    alerts/{aid}        message, seen, riskScore, source, createdAt
 *    riskHistory/{rid}   score, delta, reason, source, createdAt
 *    sensorEvents/{sid}  type, value, riskAdded, createdAt
 *    recordings/{rid}    filename, fileUrl, type, reason, size, createdAt
 *
 *  locations/{docId}     uid, latitude, longitude, timestamp
 *  globalAlerts/{aid}    uid, reason, riskScore, lat, lng, timestamp
 */

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 1 — IMPORTS
//   All packages loaded once. Firebase Admin SDK is used (server-side, secure).
//   Socket.io runs on the same HTTP server as Express.
// ═══════════════════════════════════════════════════════════════════════════

const express      = require("express");
const cors         = require("cors");
const bodyParser   = require("body-parser");
const http         = require("http");
const { Server }   = require("socket.io");
const multer       = require("multer");
const path         = require("path");
const fs           = require("fs");
require("dotenv").config();

// Firebase Admin SDK — full server-side access to Auth, Firestore, Storage
const admin        = require("firebase-admin");

// Twilio — outbound SMS gateway
const twilio       = require("twilio");

// Google Gemini AI — safety chatbot
const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
let geminiModel = null;
if (GEMINI_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  console.log("✅ Gemini AI initialized");
} else {
  console.log("⚠️ GEMINI_API_KEY not set. AI chatbot will not work.");
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 2 — ENVIRONMENT CONFIGURATION
//   All secrets live in .env — nothing hardcoded.
//
//   Create a .env file in your project root with these keys:
//
//   PORT=5000
//   TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//   TWILIO_TOKEN=your_auth_token
//   TWILIO_PHONE=+1xxxxxxxxxx
//   FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
// ═══════════════════════════════════════════════════════════════════════════

const PORT            = process.env.PORT           || 5000;
const TWILIO_SID      = process.env.TWILIO_SID     || "YOUR_TWILIO_SID";
const TWILIO_TOKEN    = process.env.TWILIO_TOKEN    || "YOUR_TWILIO_TOKEN";
const TWILIO_PHONE    = process.env.TWILIO_PHONE    || "YOUR_TWILIO_PHONE";
const STORAGE_BUCKET  = process.env.FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com";

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 3 — FIREBASE ADMIN INITIALISATION
//   Firebase Admin gives full server-side access to:
//     - Firebase Auth  (create/verify users)
//     - Firestore      (read/write all collections)
//     - Cloud Storage  (upload audio + video evidence files)
//
//   serviceAccountKey.json must be present in the project root.
//   Never commit this file to version control — add it to .gitignore.
// ═══════════════════════════════════════════════════════════════════════════

// If serviceAccountKey.json exists, initialize it. (Fallback check for testing)
const saPath = path.join(__dirname, "serviceAccountKey.json");
if (fs.existsSync(saPath)) {
  const serviceAccount = require("./serviceAccountKey.json");
  admin.initializeApp({
    credential:    admin.credential.cert(serviceAccount),
    storageBucket: STORAGE_BUCKET,
  });
} else {
  console.log("⚠️ serviceAccountKey.json not found! Firebase Admin not initialized properly.");
}

const db     = admin.apps.length ? admin.firestore() : null;   // Firestore database
const bucket = admin.apps.length ? admin.storage().bucket() : null; // Firebase Cloud Storage bucket

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 4 — TWILIO CLIENT INITIALISATION
//   Used exclusively by sendSMS() in Block 8.
//   Credentials are read from .env — never hardcode these.
// ═══════════════════════════════════════════════════════════════════════════

let twilioClient;
try {
  twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
} catch (e) {
  console.log("⚠️ Twilio credentials missing. SMS will not work.");
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 5 — EXPRESS + SOCKET.IO SERVER SETUP
//   Express handles all REST API calls.
//   Socket.io runs on the same HTTP server for real-time WebSocket events.
//   Static /videos route serves locally cached recordings if needed.
// ═══════════════════════════════════════════════════════════════════════════

const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Serve any locally stored files (fallback if Firebase Storage is unavailable)
app.use("/videos", express.static(path.join(__dirname, "uploads")));

// Ensure local temp upload folder and logs folder exist
["uploads", "logs"].forEach((dir) => {
  if (!fs.existsSync(path.join(__dirname, dir))) fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 6 — IN-MEMORY SESSION STORE
//   Holds each active user's live risk score, recent alert list, and
//   connected socket ID so we can push targeted real-time events.
//   Survives for the lifetime of the server process.
//   For multi-server deployments, replace with Redis.
// ═══════════════════════════════════════════════════════════════════════════

// Structure: { [uid]: { riskScore: number, alerts: [], socketId: string|null } }
const activeSessions = {};

/**
 * Returns the session object for a uid.
 * Creates a blank session automatically if one doesn't exist yet.
 */
function getSession(uid) {
  if (!activeSessions[uid]) {
    activeSessions[uid] = { riskScore: 0, alerts: [], socketId: null };
  }
  return activeSessions[uid];
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 7 — RISK LEVEL THRESHOLDS
//   Maps the cumulative risk score (0–100) to a named escalation tier.
//   Thresholds are identical to shRiskScoreAI.js so both sides agree.
//
//   0  – 30  → LOW       → No external alert
//   31 – 60  → MEDIUM    → Family + Trusted contacts notified
//   61 – 85  → HIGH      → Family + Trusted + Volunteers + NGO + auto-record
//   86 – 100 → VERY HIGH → All above + Police + Emergency Services
// ═══════════════════════════════════════════════════════════════════════════

const RISK_LEVELS = {
  LOW:       { min: 0,  max: 30,  label: "LOW",       emoji: "🟢" },
  MEDIUM:    { min: 31, max: 60,  label: "MEDIUM",     emoji: "🟡" },
  HIGH:      { min: 61, max: 85,  label: "HIGH",       emoji: "🟠" },
  VERY_HIGH: { min: 86, max: 100, label: "VERY HIGH",  emoji: "🔴" },
};

/** Returns the RISK_LEVELS entry for a given numeric score 0–100. */
function getRiskLevel(score) {
  if (score <= 30) return RISK_LEVELS.LOW;
  if (score <= 60) return RISK_LEVELS.MEDIUM;
  if (score <= 85) return RISK_LEVELS.HIGH;
  return RISK_LEVELS.VERY_HIGH;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 8 — LOGGER
//   Writes every server event as a JSON line to the console AND to a
//   daily rotating file at /logs/YYYY-MM-DD.log.
//   Provides a full audit trail of every SOS, SMS, sensor event, and error.
// ═══════════════════════════════════════════════════════════════════════════

function logEvent(tag, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    tag,
    message,
    ...data,
  };
  console.log(`[${entry.timestamp}] [${tag}]`, message, data);

  const date    = new Date().toISOString().split("T")[0];
  const logPath = path.join(__dirname, "logs", `${date}.log`);
  fs.appendFileSync(logPath, JSON.stringify(entry) + "\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 9 — HELPER: GOOGLE MAPS LOCATION LINK
//   Converts raw GPS coordinates into a tappable Google Maps URL.
//   This link is embedded in every SMS so contacts can navigate instantly.
// ═══════════════════════════════════════════════════════════════════════════

function generateLocationLink(lat, lng) {
  if (!lat || !lng) return "Location unavailable";
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 10 — HELPER: SEND SMS VIA TWILIO
//   Single function used by all alert dispatchers.
//   Failures are caught and logged without crashing the server so one
//   bad phone number never blocks alerts to other contacts.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sends an SMS to one phone number via Twilio.
 * @param {string} to      - E.164 format (+91XXXXXXXXXX)
 * @param {string} message - SMS body
 */
async function sendSMS(to, message) {
  try {
    if (!twilioClient) throw new Error("Twilio client not initialized");
    await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE,
      to,
    });
    logEvent("SMS", `✅ Sent to ${to}`);
  } catch (err) {
    logEvent("ERROR", `❌ SMS failed to ${to}`, { error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 11 — HELPER: FIRESTORE ALERT WRITER
//   Saves a timestamped alert document to users/{uid}/alerts in Firestore.
//   Every SOS, sensor trigger, and risk escalation is stored here so users
//   can review their full safety history inside the app.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Writes a new alert doc to Firestore under users/{uid}/alerts.
 * @param {string} uid
 * @param {string} message    - Human-readable alert description
 * @param {number} [riskScore=0]
 * @param {string} [source="system"]
 */
async function saveAlert(uid, message, riskScore = 0, source = "system") {
  if (!db) return;
  await db.collection("users").doc(uid).collection("alerts").add({
    message,
    riskScore,
    source,
    seen:      false,
    createdAt: new Date(),
  });
  logEvent("ALERT", `Stored for ${uid}`, { message, riskScore, source });
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 12 — HELPER: FIRESTORE RISK HISTORY WRITER
//   Saves every risk score change (from any source: shake, sound, voice,
//   manual SOS, or reset) to users/{uid}/riskHistory so the timeline of
//   risk events is permanently queryable for investigations or reviews.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Writes a risk score change event to Firestore.
 * @param {string} uid
 * @param {number} newScore  - Score after this update
 * @param {number} delta     - Points added (negative for reset)
 * @param {string} reason    - e.g. "Phone Shake Detected"
 * @param {string} source    - "shake" | "sound" | "voice" | "manual" | "reset"
 */
async function saveRiskHistory(uid, newScore, delta, reason, source) {
  if (!db) return;
  await db.collection("users").doc(uid).collection("riskHistory").add({
    score:     newScore,
    delta,
    reason,
    source,
    createdAt: new Date(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 13 — HELPER: FIRESTORE SENSOR EVENT WRITER
//   Stores raw sensor readings from shShakeDetectorAI.js,
//   shSoundDetectionAI.js, and shVoiceTriggerAI.js so the app can display
//   a sensor log and investigators can review what triggered an emergency.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Writes a sensor event to Firestore under users/{uid}/sensorEvents.
 * @param {string} uid
 * @param {string} type      - "shake" | "sound" | "voice" | "recording_start" | "recording_stop"
 * @param {*}      value     - Raw sensor value (dB, transcript text, boolean)
 * @param {number} riskAdded - Risk points this event contributed
 */
async function saveSensorEvent(uid, type, value, riskAdded) {
  if (!db) return;
  await db.collection("users").doc(uid).collection("sensorEvents").add({
    type,
    value,
    riskAdded,
    createdAt: new Date(),
  });
  logEvent("SENSOR", `${type} stored for ${uid}`, { value, riskAdded });
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 14 — HELPER: CONTACTS FETCHER + FILTER
//   getContacts()          → reads all contacts from Firestore sub-collection
//   filterContactsByType() → returns only contacts matching allowed type list
//   Used by the SMS dispatcher to target the right group per risk tier.
// ═══════════════════════════════════════════════════════════════════════════

/** Fetches all contacts for a user from Firestore. */
async function getContacts(uid) {
  if (!db) return [];
  const snap = await db
    .collection("users").doc(uid)
    .collection("contacts").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Filters a contacts array to only those whose type is in allowedTypes.
 * @param {Array}  contacts      - Full contacts array from getContacts()
 * @param {Array}  allowedTypes  - e.g. ["family", "trusted"]
 */
function filterContactsByType(contacts, allowedTypes) {
  return contacts.filter((c) => allowedTypes.includes(c.type));
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 15 — HELPER: TIERED SMS DISPATCHER
//   Fetches contacts from Firestore and sends SMS only to the groups
//   appropriate for the current risk level, matching shRiskScoreAI.js:
//
//   MEDIUM    → family + trusted
//   HIGH      → family + trusted + volunteer + ngo
//   VERY HIGH → family + trusted + volunteer + ngo + police + emergency
//
//   Every SMS includes the Google Maps location link.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sends tiered SMS notifications based on risk level.
 * @param {string} uid
 * @param {object} riskLevel    - Entry from RISK_LEVELS
 * @param {string} reason       - Alert reason text
 * @param {number} score        - Current risk score
 * @param {object|null} location - { lat, lng } or null
 */
async function dispatchByRiskLevel(uid, riskLevel, reason, score, location) {
  // LOW risk — no SMS sent
  if (riskLevel.label === "LOW") return;

  const contacts     = await getContacts(uid);
  const locationLink = generateLocationLink(location?.lat, location?.lng);

  let allowedTypes = [];
  switch (riskLevel.label) {
    case "MEDIUM":
      allowedTypes = ["family", "trusted"];
      break;
    case "HIGH":
      allowedTypes = ["family", "trusted", "volunteer", "ngo"];
      break;
    case "VERY HIGH":
      allowedTypes = ["family", "trusted", "volunteer", "ngo", "police", "emergency"];
      break;
  }

  const targets = filterContactsByType(contacts, allowedTypes);

  if (targets.length === 0) {
    logEvent("DISPATCH", `No contacts of types [${allowedTypes}] found for ${uid}`);
    return;
  }

  const smsBody =
    `${riskLevel.emoji} SAFEHER ALERT\n` +
    `Risk Level : ${riskLevel.label} (${score}/100)\n` +
    `Reason     : ${reason}\n` +
    `Location   : ${locationLink}\n` +
    `Please respond immediately!`;

  await Promise.allSettled(targets.map((c) => sendSMS(c.phone, smsBody)));

  logEvent("DISPATCH", `SMS sent to ${targets.length} contacts`, {
    uid, riskLevel: riskLevel.label, types: allowedTypes,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 16 — HELPER: CORE EMERGENCY TRIGGER
//   Called when any risk threshold is crossed.
//   Maps directly to triggerSOS() in shEmergencyServAI.js.
//   1. Saves alert to Firestore
//   2. Saves to globalAlerts collection (for admin dashboard)
//   3. Sends tiered SMS to correct contact groups
//   4. Emits real-time WebSocket event
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Full emergency handler: Firestore save + tiered SMS + WebSocket push.
 * @param {string} uid
 * @param {string} reason
 * @param {number} score
 * @param {object|null} location  - { lat, lng }
 */
async function triggerEmergency(uid, reason, score, location) {
  const riskLevel = getRiskLevel(score);

  // 1. Save to user's personal alert history
  await saveAlert(uid, `🚨 Emergency: ${reason}`, score, "emergency");

  // 2. Save to global alerts collection for admin monitoring
  if (db) {
    await db.collection("globalAlerts").add({
      uid,
      reason,
      riskScore:  score,
      riskLevel:  riskLevel.label,
      latitude:   location?.lat  || null,
      longitude:  location?.lng  || null,
      timestamp:  new Date(),
    });
  }

  // 3. Send tiered SMS to correct contacts
  await dispatchByRiskLevel(uid, riskLevel, reason, score, location);

  // 4. Push real-time event to all connected WebSocket clients
  io.emit("sos_alert", {
    uid, reason, score,
    riskLevel:  riskLevel.label,
    emoji:      riskLevel.emoji,
    location,
    timestamp:  new Date(),
  });

  // Notify dashboard if recording should auto-start
  if (score >= 61) {
    io.emit("start_recording", { uid, reason, score });
  }

  logEvent("EMERGENCY", `Triggered for ${uid}`, { reason, score, riskLevel: riskLevel.label });
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 17 — HELPER: RISK SCORE UPDATER
//   Central function that accumulates risk, saves to Firestore, updates
//   the in-memory session, and triggers emergency escalation if needed.
//   Used by all sensor routes (/sensor/shake, /sensor/sound, /sensor/voice)
//   and the manual /update-risk route.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Adds delta points to a user's risk score and handles all side effects.
 * @param {string} uid
 * @param {number} delta      - Points to add (e.g. 20, 25, 40)
 * @param {string} reason     - Human-readable reason
 * @param {string} source     - "shake" | "sound" | "voice" | "manual"
 * @param {object|null} location
 * @returns {object} { score, riskLevel }
 */
async function applyRiskDelta(uid, delta, reason, source, location = null) {
  const session     = getSession(uid);
  session.riskScore = Math.min(session.riskScore + delta, 100);
  const score       = session.riskScore;
  const riskLevel   = getRiskLevel(score);

  // Persist change to Firestore risk history
  await saveRiskHistory(uid, score, delta, reason, source);

  logEvent("RISK", `+${delta} for ${uid}`, { score, reason, riskLevel: riskLevel.label });

  // Emit real-time risk update to dashboard
  io.emit("risk_update", {
    uid, score,
    riskLevel:  riskLevel.label,
    emoji:      riskLevel.emoji,
    reason,
  });

  // Trigger emergency if threshold crossed (score > LOW)
  if (score > 30) {
    await triggerEmergency(uid, reason, score, location);
  }

  return { score, riskLevel };
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 18 — MULTER CONFIG FOR EVIDENCE UPLOAD
//   Handles multipart/form-data uploads for audio and video files.
//   Files are stored temporarily in /uploads, then moved to Firebase
//   Cloud Storage. The local temp file is deleted after upload.
//   Accepts: mp4, mov, avi, mkv, webm (video) and mp3, wav, aac, m4a (audio)
// ═══════════════════════════════════════════════════════════════════════════

const upload = multer({
  dest: path.join(__dirname, "uploads/"),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|mov|avi|mkv|webm|mp3|wav|aac|m4a/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

// ═══════════════════════════════════════════════════════════════════════════
//
//                          REST API ROUTES
//
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 19 — AUTH ROUTES
//   POST /signup              Create account (Firebase Auth + Firestore profile)
//   POST /login               Authenticate (Firebase Auth token verify)
//   POST /logout              Revoke Firebase session tokens
//   POST /verify-phone-login  Phone OTP verification (ready for Firebase Phone Auth)
//   GET  /user/:uid           Fetch stored Firestore profile
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /signup
 * Creates a Firestore profile document for a user already registered via
 * the client-side Firebase Auth SDK (createUserWithEmailAndPassword).
 * The client creates the Auth account, then calls this to persist the profile.
 *
 * Body: { uid, name, email, phone?, emergencyContacts?: [{ name, phone, type }] }
 */
app.post("/signup", async (req, res) => {
  try {
    const { uid, name, email, phone = "", emergencyContacts = [] } = req.body;

    if (!admin.apps.length) return res.status(500).json({ success: false, message: "Firebase not initialized" });
    if (!db) return res.status(500).json({ success: false, message: "Firestore not initialized" });
    if (!uid || !name || !email) return res.status(400).json({ success: false, message: "uid, name, and email are required" });

    // Save Firestore user profile (use merge so re-calls don't overwrite existing data)
    await db.collection("users").doc(uid).set({
      uid,
      name,
      email,
      phone,
      createdAt:   new Date(),
      lastLoginAt: new Date(),
    }, { merge: true });

    // Save any initial emergency contacts as sub-collection docs
    for (const contact of emergencyContacts) {
      await db.collection("users").doc(uid).collection("contacts").add({
        name:      contact.name,
        phone:     contact.phone,
        type:      contact.type || "trusted",
        createdAt: new Date(),
      });
    }

    logEvent("AUTH", `Profile created: ${email}`, { uid });

    res.status(200).json({
      success: true,
      message: "Profile Created Successfully",
      uid,
    });

  } catch (error) {
    logEvent("ERROR", "Signup profile creation failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /login
 * Verifies a Firebase ID token sent from the mobile app after client-side
 * signInWithEmailAndPassword(). Updates lastLoginAt in Firestore.
 *
 * Body: { idToken }   ← Firebase ID token from client SDK signIn result
 */
app.post("/login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!admin.apps.length) return res.status(500).json({ success: false, message: "Firebase not initialized" });

    // Verify the token cryptographically using Firebase Admin
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid     = decoded.uid;

    // Update last login timestamp in Firestore (use merge to create doc if missing)
    await db.collection("users").doc(uid).set({ lastLoginAt: new Date() }, { merge: true });

    logEvent("AUTH", `Login: ${decoded.email}`, { uid });

    res.status(200).json({
      success: true,
      message: "Login Successful",
      uid,
      email: decoded.email,
    });

  } catch (error) {
    logEvent("ERROR", "Login failed", { error: error.message });
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
});

/**
 * POST /logout
 * Revokes all refresh tokens for the user, forcing re-authentication.
 *
 * Body: { uid }
 */
app.post("/logout", async (req, res) => {
  try {
    const { uid } = req.body;
    if (!admin.apps.length) return res.status(500).json({ success: false, message: "Firebase not initialized" });

    await admin.auth().revokeRefreshTokens(uid);

    logEvent("AUTH", `Logout: ${uid}`);

    res.status(200).json({ success: true, message: "Logged out successfully" });

  } catch (error) {
    logEvent("ERROR", "Logout failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /verify-phone-login
 * Verifies a Firebase phone auth ID token (OTP flow handled by client SDK).
 * The client completes the OTP → Firebase sends back an ID token → we verify it here.
 *
 * Body: { idToken }
 */
app.post("/verify-phone-login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!admin.apps.length) return res.status(500).json({ success: false, message: "Firebase not initialized" });

    const decoded = await admin.auth().verifyIdToken(idToken);

    logEvent("AUTH", `Phone login verified: ${decoded.phone_number}`);

    res.status(200).json({
      success: true,
      message: "Phone Verified Successfully",
      uid:     decoded.uid,
      phone:   decoded.phone_number,
    });

  } catch (error) {
    logEvent("ERROR", "Phone verify failed", { error: error.message });
    res.status(500).json({ success: false, message: "Phone Verification Failed" });
  }
});

/**
 * GET /user/:uid
 * Returns the Firestore profile for a user (name, email, phone, timestamps).
 */
app.get("/user/:uid", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
    const docSnap = await db.collection("users").doc(req.params.uid).get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      user: { uid: docSnap.id, ...docSnap.data() },
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 20 — CONTACT ROUTES
//   POST   /contacts/:uid            Add a new emergency contact
//   GET    /contacts/:uid            List all contacts
//   DELETE /contacts/:uid/:cid       Remove a contact
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /contacts/:uid
 * Adds a new emergency contact to users/{uid}/contacts in Firestore.
 * Body: { name, phone, type }
 */
app.post("/contacts/:uid", async (req, res) => {
  try {
    const { name, phone, type } = req.body;
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });

    await db.collection("users").doc(req.params.uid).collection("contacts").add({
      name,
      phone,
      type:      type || "trusted",
      createdAt: new Date(),
    });

    logEvent("CONTACT", `Added for ${req.params.uid}`, { name, type });

    res.status(200).json({ success: true, message: "Contact added" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /contacts/:uid
 * Returns all emergency contacts for a user from Firestore.
 */
app.get("/contacts/:uid", async (req, res) => {
  try {
    const contacts = await getContacts(req.params.uid);
    res.status(200).json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /contacts/:uid/:cid
 * Permanently removes a contact document from Firestore.
 */
app.delete("/contacts/:uid/:cid", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
    await db
      .collection("users").doc(req.params.uid)
      .collection("contacts").doc(req.params.cid)
      .delete();

    logEvent("CONTACT", `Deleted ${req.params.cid} for ${req.params.uid}`);

    res.status(200).json({ success: true, message: "Contact deleted" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 21 — RISK SCORE ROUTES
//   POST /update-risk        → addRiskScore(value, reason)
//   POST /reset-risk         → resetRiskScore()
//   GET  /risk/:uid          → getCurrentRiskScore()
//   GET  /risk/:uid/history  → Full Firestore risk event timeline
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /update-risk
 * Adds a risk delta to the user's score.
 * Body: { uid, value, reason, source?, location? }
 */
app.post("/update-risk", async (req, res) => {
  try {
    const { uid, value = 0, reason = "", source = "manual", location = null } = req.body;

    const { score, riskLevel } = await applyRiskDelta(uid, value, reason, source, location);

    res.status(200).json({
      success:   true,
      riskScore: score,
      riskLevel: riskLevel.label,
      emoji:     riskLevel.emoji,
    });

  } catch (error) {
    logEvent("ERROR", "update-risk failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /reset-risk
 * Resets the user's risk score to 0 after they confirm they are safe.
 * Body: { uid }
 */
app.post("/reset-risk", async (req, res) => {
  try {
    const { uid } = req.body;
    const session = getSession(uid);

    session.riskScore = 0;

    // Log the reset in Firestore risk history
    await saveRiskHistory(uid, 0, 0, "User confirmed safe — risk reset", "reset");
    await saveAlert(uid, "✅ Risk score reset — user confirmed safe", 0, "reset");

    logEvent("RISK", `Reset for ${uid}`);
    io.emit("risk_reset", { uid, timestamp: new Date() });

    res.status(200).json({ success: true, message: "Risk Score Reset to 0" });

  } catch (error) {
    logEvent("ERROR", "reset-risk failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /risk/:uid
 * Returns the current live risk score for a user.
 */
app.get("/risk/:uid", (req, res) => {
  try {
    const session   = getSession(req.params.uid);
    const riskLevel = getRiskLevel(session.riskScore);

    res.status(200).json({
      success:   true,
      uid:       req.params.uid,
      riskScore: session.riskScore,
      riskLevel: riskLevel.label,
      emoji:     riskLevel.emoji,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /risk/:uid/history
 * Returns the full risk score event history from Firestore.
 */
app.get("/risk/:uid/history", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
    const snap = await db
      .collection("users").doc(req.params.uid)
      .collection("riskHistory")
      .orderBy("createdAt", "desc")
      .get();

    const history = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.status(200).json({ success: true, history });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 22 — SENSOR EVENT ROUTES
//   POST /sensor/shake  ← shShakeDetectorAI.js   (+20 pts)
//   POST /sensor/sound  ← shSoundDetectionAI.js  (+25 pts)
//   POST /sensor/voice  ← shVoiceTriggerAI.js    (+40 pts)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /sensor/shake
 * Body: { uid, location?: { lat, lng } }
 */
app.post("/sensor/shake", async (req, res) => {
  try {
    const { uid, location = null } = req.body;
    const DELTA  = 20;
    const reason = "Phone Shake Detected";

    await saveSensorEvent(uid, "shake", true, DELTA);
    const { score, riskLevel } = await applyRiskDelta(uid, DELTA, reason, "shake", location);

    res.status(200).json({
      success:   true,
      message:   "Shake event processed",
      riskScore: score,
      riskLevel: riskLevel.label,
    });

  } catch (error) {
    logEvent("ERROR", "sensor/shake failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /sensor/sound
 * Body: { uid, soundLevel, location?: { lat, lng } }
 */
app.post("/sensor/sound", async (req, res) => {
  try {
    const { uid, soundLevel = 0, location = null } = req.body;
    const DELTA  = 25;
    const reason = "Loud Sound / Scream Detected";

    await saveSensorEvent(uid, "sound", soundLevel, DELTA);
    const { score, riskLevel } = await applyRiskDelta(uid, DELTA, reason, "sound", location);

    res.status(200).json({
      success:   true,
      message:   "Sound event processed",
      riskScore: score,
      riskLevel: riskLevel.label,
    });

  } catch (error) {
    logEvent("ERROR", "sensor/sound failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /sensor/voice
 * Body: { uid, transcript, location?: { lat, lng } }
 */
app.post("/sensor/voice", async (req, res) => {
  try {
    const { uid, transcript = "", location = null } = req.body;
    const DELTA  = 40;
    const reason = "Emergency Voice Trigger";

    await saveSensorEvent(uid, "voice", transcript, DELTA);
    const { score, riskLevel } = await applyRiskDelta(uid, DELTA, reason, "voice", location);

    res.status(200).json({
      success:    true,
      message:    "Voice event processed",
      transcript,
      riskScore:  score,
      riskLevel:  riskLevel.label,
    });

  } catch (error) {
    logEvent("ERROR", "sensor/voice failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 23 — EMERGENCY / SOS ROUTES
//   POST /trigger-sos      ← Called directly by shEmergencyServAI.js
//   POST /smart-emergency  ← Server-side sensor eval + auto-escalation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /trigger-sos
 * Body: { uid, reason, riskScore?, location?: { lat, lng }, timestamp? }
 */
app.post("/trigger-sos", async (req, res) => {
  try {
    const {
      uid,
      reason    = "Emergency SOS",
      riskScore = 100,
      location  = null,
    } = req.body;

    logEvent("SOS", `🚨 SOS received from ${uid}`, { reason, riskScore });

    const riskLevel = getRiskLevel(riskScore);
    const session   = getSession(uid);

    session.riskScore = Math.min(riskScore, 100);
    await triggerEmergency(uid, reason, riskScore, location);

    res.status(200).json({
      success:         true,
      message:         "SOS Triggered Successfully",
      alertLevel:      riskLevel.label,
      emoji:           riskLevel.emoji,
      startRecording:  riskScore >= 61,
      vibration:       true,
    });

  } catch (error) {
    logEvent("ERROR", "trigger-sos failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /smart-emergency
 * Body: { uid, voice?, soundLevel?, shake?, location?: { lat, lng } }
 */
app.post("/smart-emergency", async (req, res) => {
  try {
    const { uid, voice = "", soundLevel = -100, shake = false, location = null } = req.body;

    let delta = 0;
    if (voice.toLowerCase().includes("help me") ||
        voice.toLowerCase().includes("save me") ||
        voice.toLowerCase().includes("emergency")) delta += 40;
    if (soundLevel > -5)   delta += 25;
    if (shake === true)    delta += 20;

    if (delta === 0) {
      return res.status(200).json({ success: true, message: "No risk detected", riskScore: getSession(uid).riskScore });
    }

    const reason = [
      shake ? "Shake" : null,
      soundLevel > -5 ? "Loud Sound" : null,
      delta >= 40 ? "Voice Trigger" : null,
    ].filter(Boolean).join(" + ");

    const { score, riskLevel } = await applyRiskDelta(uid, delta, reason, "smart", location);

    res.status(200).json({
      success:   true,
      message:   "Smart emergency evaluated",
      riskScore: score,
      riskLevel: riskLevel.label,
    });

  } catch (error) {
    logEvent("ERROR", "smart-emergency failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 24 — LOCATION ROUTES
//   POST /save-location   → Saves GPS coordinates to Firestore
//   GET  /location/:uid   → Returns the most recent location for a user
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /save-location
 * Body: { uid, latitude, longitude }
 */
app.post("/save-location", async (req, res) => {
  try {
    const { uid, latitude, longitude } = req.body;
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });

    await db.collection("locations").add({
      uid,
      latitude,
      longitude,
      timestamp: new Date(),
    });

    logEvent("LOCATION", `Saved for ${uid}`, { latitude, longitude });

    res.status(200).json({ success: true, message: "Location Saved Successfully" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /location/:uid
 */
app.get("/location/:uid", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
    const snap = await db
      .collection("locations")
      .where("uid", "==", req.params.uid)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (snap.empty) {
      return res.status(404).json({ success: false, message: "No location found" });
    }

    const loc = snap.docs[0].data();

    res.status(200).json({
      success:   true,
      latitude:  loc.latitude,
      longitude: loc.longitude,
      timestamp: loc.timestamp,
      mapsLink:  generateLocationLink(loc.latitude, loc.longitude),
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 25 — VIDEO RECORDING ROUTES
//   POST /recording/start    → Logs recording start event to Firestore
//   POST /recording/stop     → Logs recording stop event to Firestore
//   POST /upload-evidence    → Uploads audio/video to Firebase Cloud Storage
//   GET  /recordings/:uid    → Lists all saved recordings for a user
// ═══════════════════════════════════════════════════════════════════════════

app.post("/recording/start", async (req, res) => {
  try {
    const { uid, reason = "Auto Recording Started" } = req.body;

    await saveSensorEvent(uid, "recording_start", reason, 0);
    await saveAlert(uid, `🎥 Video recording started: ${reason}`, 0, "recording");

    io.emit("recording_started", { uid, reason, timestamp: new Date() });
    logEvent("RECORDING", `Started for ${uid}`, { reason });

    res.status(200).json({ success: true, message: "Recording start logged" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/recording/stop", async (req, res) => {
  try {
    const { uid } = req.body;

    await saveSensorEvent(uid, "recording_stop", true, 0);
    await saveAlert(uid, "🛑 Video recording stopped", 0, "recording");

    io.emit("recording_stopped", { uid, timestamp: new Date() });
    logEvent("RECORDING", `Stopped for ${uid}`);

    res.status(200).json({ success: true, message: "Recording stop logged" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/upload-evidence", upload.single("file"), async (req, res) => {
  try {
    const { uid, type = "video", reason = "SOS Evidence" } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });

    const fileName  = `${uid}_${Date.now()}_${file.originalname || 'recording.m4a'}`;
    const destPath  = `evidence/${uid}/${fileName}`;
    let fileUrl = null;

    // Try to upload to Firebase Storage if bucket is available
    if (bucket) {
      try {
        // Check if bucket exists before uploading
        const [exists] = await bucket.exists();
        if (exists) {
          await bucket.upload(file.path, {
            destination: destPath,
            metadata:    { contentType: file.mimetype },
          });
          fileUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`;
          logEvent("EVIDENCE", `Uploaded to Firebase Storage for ${uid}`, { fileName, type, size: file.size });
        } else {
          logEvent("WARN", `Firebase Storage bucket does not exist. File saved locally only.`, { bucket: STORAGE_BUCKET });
          fileUrl = `/videos/${path.basename(file.path)}`;
        }
      } catch (storageError) {
        logEvent("WARN", `Firebase Storage upload failed. File saved locally only.`, { error: storageError.message });
        fileUrl = `/videos/${path.basename(file.path)}`;
      }
    } else {
      logEvent("WARN", `Firebase Storage not initialized. File saved locally only.`);
      fileUrl = `/videos/${path.basename(file.path)}`;
    }

    // Save recording metadata to Firestore
    await db.collection("users").doc(uid).collection("recordings").add({
      fileName,
      fileUrl,
      type,
      reason,
      size:       file.size,
      mimeType:   file.mimetype,
      createdAt:  new Date(),
    });

    await saveAlert(uid, `📁 Evidence uploaded: ${fileName} (${type})`, 0, "evidence");

    // Only delete local file if successfully uploaded to Firebase Storage
    if (bucket && fileUrl.startsWith('https://')) {
      fs.unlinkSync(file.path);
    }

    io.emit("evidence_uploaded", { uid, type, fileUrl, timestamp: new Date() });

    res.status(200).json({
      success:  true,
      message:  "Evidence Uploaded Successfully",
      fileName,
      fileUrl,
    });

  } catch (error) {
    logEvent("ERROR", "upload-evidence failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/recordings/:uid", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
    const snap = await db
      .collection("users").doc(req.params.uid)
      .collection("recordings")
      .orderBy("createdAt", "desc")
      .get();

    const recordings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.status(200).json({ success: true, recordings });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 26 — ALERT HISTORY ROUTES
//   GET  /alerts/:uid             Returns all alerts for one user only
//   POST /alerts/:uid/seen/:aid   Marks a single alert as seen
//   GET  /alerts/admin/all        Returns all global alerts (admin use only)
// ═══════════════════════════════════════════════════════════════════════════

app.get("/alerts/:uid", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
    const snap = await db
      .collection("users").doc(req.params.uid)
      .collection("alerts")
      .orderBy("createdAt", "desc")
      .get();

    const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.status(200).json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/alerts/:uid/seen/:aid", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
    await db
      .collection("users").doc(req.params.uid)
      .collection("alerts").doc(req.params.aid)
      .update({ seen: true, seenAt: new Date() });

    res.status(200).json({ success: true, message: "Alert marked as seen" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/alerts/admin/all", async (req, res) => {
  try {
    if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
    const snap = await db
      .collection("globalAlerts")
      .orderBy("timestamp", "desc")
      .get();

    const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.status(200).json({ success: true, alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 27 — UTILITY ROUTES
//   GET /session/:uid  → Live in-memory session (score + recent alerts)
//   GET /health        → Server uptime, active sessions, timestamp
// ═══════════════════════════════════════════════════════════════════════════

app.get("/session/:uid", (req, res) => {
  const session   = activeSessions[req.params.uid];
  const riskLevel = getRiskLevel(session?.riskScore || 0);

  res.status(200).json({
    success:   true,
    uid:       req.params.uid,
    riskScore: session?.riskScore  || 0,
    riskLevel: riskLevel.label,
    emoji:     riskLevel.emoji,
    alerts:    session?.alerts     || [],
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status:         "✅ SafeHer Backend is running",
    uptime:         `${Math.floor(process.uptime())}s`,
    activeSessions: Object.keys(activeSessions).length,
    timestamp:      new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 28 — WEBSOCKET EVENTS (Socket.io)
// ═══════════════════════════════════════════════════════════════════════════

io.on("connection", (socket) => {
  logEvent("SOCKET", `Connected: ${socket.id}`);

  socket.on("register", ({ uid }) => {
    const session    = getSession(uid);
    session.socketId = socket.id;

    logEvent("SOCKET", `Registered uid: ${uid}`, { socketId: socket.id });

    socket.emit("risk_sync", {
      uid,
      riskScore: session.riskScore,
      riskLevel: getRiskLevel(session.riskScore).label,
      emoji:     getRiskLevel(session.riskScore).emoji,
    });
  });

  socket.on("disconnect", () => {
    logEvent("SOCKET", `Disconnected: ${socket.id}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 30 — AI SAFETY CHATBOT
//   POST /ai/chat  → Gemini-powered safety assistant
// ═══════════════════════════════════════════════════════════════════════════

const SAFETY_SYSTEM_PROMPT = `You are SafeHer AI — a women's safety assistant built into a personal safety app.
Your role is to provide:
- Immediate safety advice when the user feels threatened
- Self-defense tips and escape strategies
- Guidance on using the app's SOS features
- Emotional support and reassurance
- Information about emergency helplines in India (Women Helpline: 1091, Police: 100, Ambulance: 108)
- Travel safety tips for women

Rules:
- Keep responses SHORT (2-4 sentences max) unless the user asks for detail
- Be empathetic, calm, and reassuring
- If the user says they are in IMMEDIATE danger, tell them to press the SOS button NOW and call 100
- Never give medical or legal advice — direct them to professionals
- Use emojis sparingly for warmth
- Always prioritize the user's safety above everything`;

function getLocalSafetyReply(message) {
  const text = String(message || "").toLowerCase();

  if (/(immediate|danger|unsafe|threat|follow|attack|emergency|help|sos)/.test(text)) {
    return "If you feel in immediate danger, press the SOS button now and call 100. Move toward a public, well-lit place, share your live location with a trusted contact, and avoid confronting the person directly.";
  }

  if (/(night|late|travel|cab|taxi|auto|walk|alone)/.test(text)) {
    return "For night travel, share your live location, choose well-lit main roads, keep your phone charged, and sit near the driver-side rear seat in a cab. If anything feels wrong, call someone and move to a busier area.";
  }

  if (/(self.?defen[cs]e|defend|grab|escape|pepper)/.test(text)) {
    return "Focus on creating distance, not fighting. Use your voice loudly, target an opening to escape, protect your head and neck, and run toward people or light as soon as you can.";
  }

  if (/(number|helpline|police|ambulance|india)/.test(text)) {
    return "In India, call Police 100, Women Helpline 1091, Ambulance 108, or the national emergency number 112. If you are using SafeHer, press SOS so your trusted contacts also get alerted.";
  }

  if (/(route|map|location|share)/.test(text)) {
    return "Use the Safe Route Map, prefer main roads, and share your live location before starting. If the route feels isolated, change direction toward a crowded or well-lit place.";
  }

  return "I can help with emergency steps, safer routes, night travel, self-defense basics, and helpline numbers. If this is urgent, press SOS and call 100 immediately.";
}

app.post("/ai/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    if (!geminiModel) {
      const reply = getLocalSafetyReply(message);
      logEvent("AI", "Using local fallback because Gemini is not configured", { messageLength: message.length });
      return res.status(200).json({ success: true, reply, fallback: true });
    }

    // Build conversation history for context
    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const chat = geminiModel.startChat({
      history: [
        { role: 'user', parts: [{ text: 'You are SafeHer AI. Follow these instructions: ' + SAFETY_SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I am SafeHer AI, your personal safety assistant. How can I help you stay safe? 🛡️' }] },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    logEvent("AI", `Chat response generated`, { messageLength: message.length });

    res.status(200).json({
      success: true,
      reply,
    });

  } catch (error) {
    const message = req.body?.message || "";
    logEvent("WARN", "AI provider unavailable; using local fallback", { error: error.message });
    res.status(200).json({
      success: true,
      reply: getLocalSafetyReply(message),
      fallback: true,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 31 — SERVER START
// ═══════════════════════════════════════════════════════════════════════════

httpServer.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log(`║        🚀  SafeHer Backend running on port ${PORT}          ║`);
  console.log("╚══════════════════════════════════════════════════════════╝");
});
