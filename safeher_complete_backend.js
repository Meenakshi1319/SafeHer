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

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential:    admin.credential.cert(serviceAccount),
  storageBucket: STORAGE_BUCKET,
});

const db     = admin.firestore();   // Firestore database
const bucket = admin.storage().bucket(); // Firebase Cloud Storage bucket

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK 4 — TWILIO CLIENT INITIALISATION
//   Used exclusively by sendSMS() in Block 8.
//   Credentials are read from .env — never hardcode these.
// ═══════════════════════════════════════════════════════════════════════════

const twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);

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
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
  const logPath = path.join("logs", `${date}.log`);
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
  await db.collection("globalAlerts").add({
    uid,
    reason,
    riskScore:  score,
    riskLevel:  riskLevel.label,
    latitude:   location?.lat  || null,
    longitude:  location?.lng  || null,
    timestamp:  new Date(),
  });

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
  dest: "uploads/",
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
 * Creates a Firebase Auth user and a Firestore profile document.
 * Also registers the initial emergency contacts list if provided.
 *
 * Body: { name, email, password, phone?, emergencyContacts?: [{ name, phone, type }] }
 */
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone = "", emergencyContacts = [] } = req.body;

    // Create Firebase Auth account
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone && phone.startsWith("+") ? phone : undefined,
    });

    const uid = userRecord.uid;

    // Save Firestore user profile
    await db.collection("users").doc(uid).set({
      uid,
      name,
      email,
      phone,
      createdAt:   new Date(),
      lastLoginAt: new Date(),
    });

    // Save any initial emergency contacts as sub-collection docs
    for (const contact of emergencyContacts) {
      await db.collection("users").doc(uid).collection("contacts").add({
        name:      contact.name,
        phone:     contact.phone,
        type:      contact.type || "trusted",
        createdAt: new Date(),
      });
    }

    logEvent("AUTH", `Signup: ${email}`, { uid });

    res.status(200).json({
      success: true,
      message: "Signup Successful",
      uid,
    });

  } catch (error) {
    logEvent("ERROR", "Signup failed", { error: error.message });
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

    // Verify the token cryptographically using Firebase Admin
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid     = decoded.uid;

    // Update last login timestamp in Firestore
    await db.collection("users").doc(uid).update({ lastLoginAt: new Date() });

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
//
//   Contact types:
//     "family"    → MEDIUM, HIGH, VERY HIGH alerts
//     "trusted"   → MEDIUM, HIGH, VERY HIGH alerts
//     "volunteer" → HIGH, VERY HIGH alerts
//     "ngo"       → HIGH, VERY HIGH alerts
//     "police"    → VERY HIGH only
//     "emergency" → VERY HIGH only
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /contacts/:uid
 * Adds a new emergency contact to users/{uid}/contacts in Firestore.
 * Body: { name, phone, type }
 */
app.post("/contacts/:uid", async (req, res) => {
  try {
    const { name, phone, type } = req.body;

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
//   Mirrors the three exported functions in shRiskScoreAI.js:
//
//   POST /update-risk        → addRiskScore(value, reason)
//   POST /reset-risk         → resetRiskScore()
//   GET  /risk/:uid          → getCurrentRiskScore()
//   GET  /risk/:uid/history  → Full Firestore risk event timeline
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /update-risk
 * Adds a risk delta to the user's score.
 * Called by shRiskScoreAI.js after every addRiskScore() call to sync
 * the mobile score with the backend.
 *
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
 * Mirrors resetRiskScore() in shRiskScoreAI.js.
 *
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
 * Mirrors getCurrentRiskScore() in shRiskScoreAI.js.
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
 * Ordered newest first so the app can show a timeline.
 */
app.get("/risk/:uid/history", async (req, res) => {
  try {
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
//   One dedicated endpoint per sensor type, matching each AI file exactly.
//   Each route:
//     1. Stores the raw event in Firestore sensorEvents
//     2. Calls applyRiskDelta() which handles accumulation + escalation
//
//   POST /sensor/shake  ← shShakeDetectorAI.js   (+20 pts)
//   POST /sensor/sound  ← shSoundDetectionAI.js  (+25 pts)
//   POST /sensor/voice  ← shVoiceTriggerAI.js    (+40 pts)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /sensor/shake
 * Called when shShakeDetectorAI.js detects a phone shake event.
 * Adds 20 risk points (matching shRiskScoreAI.js addRiskScore(20, ...)).
 *
 * Body: { uid, location?: { lat, lng } }
 */
app.post("/sensor/shake", async (req, res) => {
  try {
    const { uid, location = null } = req.body;
    const DELTA  = 20;
    const reason = "Phone Shake Detected";

    // Store sensor event in Firestore
    await saveSensorEvent(uid, "shake", true, DELTA);

    // Apply risk delta (accumulate + escalate if needed)
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
 * Called when shSoundDetectionAI.js detects a loud sound or scream.
 * Adds 25 risk points (matching shRiskScoreAI.js addRiskScore(25, ...)).
 *
 * Body: { uid, soundLevel, location?: { lat, lng } }
 */
app.post("/sensor/sound", async (req, res) => {
  try {
    const { uid, soundLevel = 0, location = null } = req.body;
    const DELTA  = 25;
    const reason = "Loud Sound / Scream Detected";

    // Store raw dB value in Firestore
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
 * Called when shVoiceTriggerAI.js detects an emergency keyword.
 * Adds 40 risk points (matching shRiskScoreAI.js addRiskScore(40, ...)).
 *
 * Body: { uid, transcript, location?: { lat, lng } }
 */
app.post("/sensor/voice", async (req, res) => {
  try {
    const { uid, transcript = "", location = null } = req.body;
    const DELTA  = 40;
    const reason = "Emergency Voice Trigger";

    // Store the speech transcript in Firestore for evidence
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
 * Primary endpoint called by shEmergencyServAI.js.
 * Handles the full SOS flow: Firestore save, tiered SMS, WebSocket push.
 * Also returns flags so the mobile app knows to start recording or vibrate.
 *
 * Body: { uid, reason, riskScore?, location?: { lat, lng }, timestamp? }
 */
app.post("/trigger-sos", async (req, res) => {
  try {
    const {
      uid,
      reason    = "Emergency SOS",
      riskScore = 100,
      location  = null,
      timestamp = new Date(),
    } = req.body;

    logEvent("SOS", `🚨 SOS received from ${uid}`, { reason, riskScore });

    const riskLevel = getRiskLevel(riskScore);
    const session   = getSession(uid);

    // Sync the session score with whatever the app says
    session.riskScore = Math.min(riskScore, 100);

    // Run the full emergency trigger (Firestore + SMS + WebSocket)
    await triggerEmergency(uid, reason, riskScore, location);

    res.status(200).json({
      success:         true,
      message:         "SOS Triggered Successfully",
      alertLevel:      riskLevel.label,
      emoji:           riskLevel.emoji,
      startRecording:  riskScore >= 61,   // tells app to call startAutoRecording()
      vibration:       true,              // tells app to vibrate
    });

  } catch (error) {
    logEvent("ERROR", "trigger-sos failed", { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /smart-emergency
 * Accepts raw sensor values, evaluates risk server-side, and auto-escalates.
 * Alternative to /trigger-sos when the app wants the server to decide level.
 *
 * Body: { uid, voice?, soundLevel?, shake?, location?: { lat, lng } }
 */
app.post("/smart-emergency", async (req, res) => {
  try {
    const { uid, voice = "", soundLevel = -100, shake = false, location = null } = req.body;

    // Calculate risk increment from sensor inputs
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
 * Saves the user's current GPS coordinates to the Firestore locations collection.
 * Called periodically by the app while SafeHer is active.
 *
 * Body: { uid, latitude, longitude }
 */
app.post("/save-location", async (req, res) => {
  try {
    const { uid, latitude, longitude } = req.body;

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
 * Returns the most recent saved location for a user from Firestore.
 */
app.get("/location/:uid", async (req, res) => {
  try {
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
//   Mirrors startAutoRecording() and stopAutoRecording() from shAutoVideoRecAI.js.
//
//   POST /recording/start    → Logs recording start event to Firestore
//   POST /recording/stop     → Logs recording stop event to Firestore
//   POST /upload-evidence    → Uploads audio/video to Firebase Cloud Storage
//   GET  /recordings/:uid    → Lists all saved recordings for a user
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /recording/start
 * Called when shAutoVideoRecAI.js calls startAutoRecording().
 * Logs the start event so the full recording timeline is in Firestore.
 *
 * Body: { uid, reason? }
 */
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

/**
 * POST /recording/stop
 * Called when shAutoVideoRecAI.js calls stopAutoRecording().
 * Logs the stop event to Firestore.
 *
 * Body: { uid }
 */
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

/**
 * POST /upload-evidence
 * Uploads an audio or video file to Firebase Cloud Storage.
 * Stores full metadata in Firestore under users/{uid}/recordings.
 * Deletes the local temp file after successful upload.
 *
 * Form-data: { file (audio/video), uid, type ("audio"|"video"), reason? }
 */
app.post("/upload-evidence", upload.single("file"), async (req, res) => {
  try {
    const { uid, type = "video", reason = "SOS Evidence" } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileName  = `${uid}_${Date.now()}_${file.originalname}`;
    const destPath  = `evidence/${uid}/${fileName}`;

    // Upload to Firebase Cloud Storage
    await bucket.upload(file.path, {
      destination: destPath,
      metadata:    { contentType: file.mimetype },
    });

    // Build the public URL
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`;

    // Save recording metadata to Firestore under the user's sub-collection
    await db.collection("users").doc(uid).collection("recordings").add({
      fileName,
      fileUrl,
      type,       // "audio" or "video"
      reason,
      size:       file.size,
      mimeType:   file.mimetype,
      createdAt:  new Date(),
    });

    // Also save a cross-reference alert
    await saveAlert(uid, `📁 Evidence uploaded: ${fileName} (${type})`, 0, "evidence");

    // Delete the local temp file
    fs.unlinkSync(file.path);

    logEvent("EVIDENCE", `Uploaded for ${uid}`, { fileName, type, size: file.size });
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

/**
 * GET /recordings/:uid
 * Returns all recording metadata documents from Firestore for a user.
 */
app.get("/recordings/:uid", async (req, res) => {
  try {
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

/**
 * GET /alerts/:uid
 * Returns all alert documents for a specific user (newest first).
 * Filtered by uid — users cannot see each other's alerts.
 */
app.get("/alerts/:uid", async (req, res) => {
  try {
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

/**
 * POST /alerts/:uid/seen/:aid
 * Marks a specific alert document as seen (read by the user).
 * Updates the `seen` field in Firestore.
 */
app.post("/alerts/:uid/seen/:aid", async (req, res) => {
  try {
    await db
      .collection("users").doc(req.params.uid)
      .collection("alerts").doc(req.params.aid)
      .update({ seen: true, seenAt: new Date() });

    res.status(200).json({ success: true, message: "Alert marked as seen" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /alerts/admin/all
 * Returns all alerts across all users from the globalAlerts collection.
 * Protect this endpoint with admin authentication in production.
 */
app.get("/alerts/admin/all", async (req, res) => {
  try {
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

/**
 * GET /session/:uid
 * Returns the current in-memory session state for a user.
 * Useful for the app to resync state after a reconnect or app restart.
 */
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

/**
 * GET /health
 * Server health check — confirms the backend is running.
 */
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
//   Real-time bidirectional channel between backend and all clients.
//   The mobile app and admin dashboard connect here to get instant pushes.
//
//   Server → Client events emitted:
//     sos_alert          → when /trigger-sos fires
//     risk_update        → on every risk score change
//     risk_reset         → when risk is cleared
//     start_recording    → when score ≥ 61 (tells app to record)
//     recording_started  → when /recording/start is called
//     recording_stopped  → when /recording/stop is called
//     evidence_uploaded  → when evidence file is saved to Firebase Storage
//     risk_sync          → sent immediately on socket register with current score
// ═══════════════════════════════════════════════════════════════════════════

io.on("connection", (socket) => {
  logEvent("SOCKET", `Connected: ${socket.id}`);

  /**
   * Client sends { uid } right after connecting.
   * We link the socket ID to their session and immediately send back
   * their current risk state so the UI can sync without an API call.
   */
  socket.on("register", ({ uid }) => {
    const session    = getSession(uid);
    session.socketId = socket.id;

    logEvent("SOCKET", `Registered uid: ${uid}`, { socketId: socket.id });

    // Immediately sync current risk state to this client
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
// BLOCK 29 — SERVER START
// ═══════════════════════════════════════════════════════════════════════════

httpServer.listen(PORT, () => {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log(`║        🚀  SafeHer Backend running on port ${PORT}          ║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  AUTH                                                    ║");
  console.log("║    POST  /signup                 Register user           ║");
  console.log("║    POST  /login                  Login (ID token verify) ║");
  console.log("║    POST  /logout                 Revoke tokens           ║");
  console.log("║    POST  /verify-phone-login     OTP verify              ║");
  console.log("║    GET   /user/:uid              Get profile             ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  CONTACTS                                                ║");
  console.log("║    POST  /contacts/:uid          Add contact             ║");
  console.log("║    GET   /contacts/:uid          List contacts           ║");
  console.log("║    DEL   /contacts/:uid/:cid     Delete contact          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  RISK SCORE  ← shRiskScoreAI.js                         ║");
  console.log("║    POST  /update-risk            addRiskScore()          ║");
  console.log("║    POST  /reset-risk             resetRiskScore()        ║");
  console.log("║    GET   /risk/:uid              getCurrentRiskScore()   ║");
  console.log("║    GET   /risk/:uid/history      Full timeline           ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  SENSORS                                                 ║");
  console.log("║    POST  /sensor/shake           shShakeDetectorAI.js   ║");
  console.log("║    POST  /sensor/sound           shSoundDetectionAI.js  ║");
  console.log("║    POST  /sensor/voice           shVoiceTriggerAI.js    ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  EMERGENCY  ← shEmergencyServAI.js                      ║");
  console.log("║    POST  /trigger-sos            Full SOS trigger        ║");
  console.log("║    POST  /smart-emergency        Sensor AI eval          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  LOCATION                                                ║");
  console.log("║    POST  /save-location          Save GPS coords         ║");
  console.log("║    GET   /location/:uid          Get latest location     ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  RECORDING  ← shAutoVideoRecAI.js                       ║");
  console.log("║    POST  /recording/start        startAutoRecording()    ║");
  console.log("║    POST  /recording/stop         stopAutoRecording()     ║");
  console.log("║    POST  /upload-evidence        Upload audio/video      ║");
  console.log("║    GET   /recordings/:uid        List recordings         ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  ALERTS                                                  ║");
  console.log("║    GET   /alerts/:uid            User alert history      ║");
  console.log("║    POST  /alerts/:uid/seen/:aid  Mark as seen            ║");
  console.log("║    GET   /alerts/admin/all       All alerts (admin)      ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  UTILS                                                   ║");
  console.log("║    GET   /session/:uid           Live session state      ║");
  console.log("║    GET   /health                 Health check            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
});