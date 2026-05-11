/**
 * Recording / Evidence Routes
 */
const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const { db, bucket } = require('../../config/dependencies');
const { logEvent, saveSensorEvent, saveAlert } = require('../../services/coreServices');

const upload = multer({
  dest: path.join(__dirname, "..", "..", "uploads/"),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extAllowed  = /mp4|mov|avi|mkv|webm|mp3|wav|aac|m4a/i;
    const mimeAllowed = /video\/|audio\//i;
    cb(null, extAllowed.test(path.extname(file.originalname)) && mimeAllowed.test(file.mimetype || ""));
  },
});

module.exports = function(middlewares, io) {
  const { requireAuth, requireSelfOrAdmin } = middlewares;

  router.post("/recording/start", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, reason = "Auto Recording Started" } = req.body;
      if (!uid) return res.status(400).json({ success: false, message: "uid is required" });
      await saveSensorEvent(uid, "recording_start", reason, 0);
      await saveAlert(uid, `🎥 Video recording started: ${reason}`, 0, "recording");
      io.to(`user:${uid}`).emit("recording_started", { uid, reason, timestamp: new Date() });
      io.to("admin").emit("recording_started", { uid, reason, timestamp: new Date() });
      logEvent("RECORDING", `Started for ${uid}`, { reason });
      res.status(200).json({ success: true, message: "Recording start logged" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/recording/stop", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ success: false, message: "uid is required" });
      await saveSensorEvent(uid, "recording_stop", true, 0);
      await saveAlert(uid, "🛑 Video recording stopped", 0, "recording");
      io.to(`user:${uid}`).emit("recording_stopped", { uid, timestamp: new Date() });
      io.to("admin").emit("recording_stopped", { uid, timestamp: new Date() });
      logEvent("RECORDING", `Stopped for ${uid}`);
      res.status(200).json({ success: true, message: "Recording stop logged" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/upload-evidence", requireAuth, upload.single("file"), requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, type = "video", reason = "SOS Evidence" } = req.body;
      const file = req.file;
      if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });

      const fileName = `${uid}_${Date.now()}_${file.originalname || 'recording.m4a'}`;
      const destPath = `evidence/${uid}/${fileName}`;
      let fileUrl = null;

      if (bucket) {
        try {
          const [exists] = await bucket.exists();
          if (exists) {
            await bucket.upload(file.path, { destination: destPath, metadata: { contentType: file.mimetype } });
            fileUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`;
          } else {
            fileUrl = `/videos/${path.basename(file.path)}`;
          }
        } catch (storageError) {
          logEvent("WARN", `Firebase Storage upload failed`, { error: storageError.message });
          fileUrl = `/videos/${path.basename(file.path)}`;
        }
      } else {
        fileUrl = `/videos/${path.basename(file.path)}`;
      }

      const crypto = require("crypto");
      let fileHash = "unavailable";
      if (file.path) {
        try {
          const fileBuffer = await fs.promises.readFile(file.path);
          fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
        } catch (hashErr) {
          logEvent("WARN", "Evidence hashing failed", { error: hashErr.message });
        }
      }

      await db.collection("users").doc(uid).collection("recordings").add({
        fileName, fileUrl, type, reason, size: file.size, mimeType: file.mimetype, fileHash, createdAt: new Date(),
      });
      await saveAlert(uid, `📁 Evidence uploaded: ${fileName} (${type})`, 0, "evidence");

      if (bucket && fileUrl.startsWith("https://") && file.path) {
        await fs.promises.unlink(file.path).catch(() => {});
      }

      io.to(`user:${uid}`).emit("evidence_uploaded", { uid, type, fileUrl, fileHash, timestamp: new Date() });
      io.to("admin").emit("evidence_uploaded", { uid, type, fileUrl, fileHash, timestamp: new Date() });

      res.status(200).json({ success: true, message: "Evidence Uploaded Successfully", fileName, fileUrl, fileHash });
    } catch (error) {
      if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
      logEvent("ERROR", "upload-evidence failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get("/recordings/:uid", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ success: false, message: "DB not connected" });
      const snap = await db.collection("users").doc(req.params.uid).collection("recordings").orderBy("createdAt", "desc").get();
      res.status(200).json({ success: true, recordings: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
