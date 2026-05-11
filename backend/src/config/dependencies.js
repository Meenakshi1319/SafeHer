/**
 * SafeHer — Shared dependencies and infrastructure
 *
 * Centralises all third-party inits (Firebase Admin, Twilio, Gemini AI,
 * Express, Socket.io) so every service / controller can import what it
 * needs without circular dependencies.
 */

const admin  = require("firebase-admin");
const path   = require("path");
const fs     = require("fs");
require("dotenv").config();

// ── Environment ──────────────────────────────────────────────────────────────

const PORT            = process.env.PORT           || 5000;
const TWILIO_SID      = process.env.TWILIO_SID     || "YOUR_TWILIO_SID";
const TWILIO_TOKEN    = process.env.TWILIO_TOKEN    || "YOUR_TWILIO_TOKEN";
const TWILIO_PHONE    = process.env.TWILIO_PHONE    || "YOUR_TWILIO_PHONE";
const STORAGE_BUCKET  = process.env.FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map((o) => o.trim()).filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.length === 0) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

// ── Firebase Admin ───────────────────────────────────────────────────────────

const saPath = path.join(__dirname, "..", "serviceAccountKey.json");
if (fs.existsSync(saPath)) {
  const serviceAccount = require(saPath);
  admin.initializeApp({
    credential:    admin.credential.cert(serviceAccount),
    storageBucket: STORAGE_BUCKET,
  });
} else {
  console.log("⚠️ serviceAccountKey.json not found! Firebase Admin not initialized properly.");
}

const db     = admin.apps.length ? admin.firestore() : null;
const bucket = admin.apps.length ? admin.storage().bucket() : null;

// ── Twilio ───────────────────────────────────────────────────────────────────

const twilio = require("twilio");
let twilioClient;
try {
  twilioClient = twilio(TWILIO_SID, TWILIO_TOKEN);
} catch (e) {
  console.log("⚠️ Twilio credentials missing. SMS will not work.");
}

// ── Gemini AI ────────────────────────────────────────────────────────────────

const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_KEY   = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL   || "gemini-2.0-flash";
let geminiModel = null;
if (GEMINI_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  console.log("✅ Gemini AI initialized");
} else {
  console.log("⚠️ GEMINI_API_KEY not set. AI chatbot will not work.");
}

module.exports = {
  admin, db, bucket,
  twilioClient, TWILIO_PHONE,
  geminiModel,
  PORT, STORAGE_BUCKET,
  isOriginAllowed,
};
