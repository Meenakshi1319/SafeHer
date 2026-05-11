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
      logEvent("INFO", "📤 [UPLOAD] Evidence upload request received");
      logEvent("INFO", "📤 [UPLOAD] Request body fields", { 
        uid: req.body.uid, 
        type: req.body.type, 
        reason: req.body.reason,
        evidenceHash: req.body.evidenceHash ? req.body.evidenceHash.substring(0, 16) + '...' : 'none'
      });
      
      const { uid, type = "video", reason = "SOS Evidence", evidenceHash } = req.body;
      const file = req.file;
      
      logEvent("INFO", "📤 [UPLOAD] File received", { 
        hasFile: !!file,
        fileName: file?.originalname,
        fileSize: file?.size,
        mimeType: file?.mimetype,
        filePath: file?.path
      });
      
      if (!file) {
        logEvent("ERROR", "❌ [UPLOAD] No file in request");
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      
      if (!db) {
        logEvent("ERROR", "❌ [UPLOAD] Database not connected");
        return res.status(500).json({ success: false, message: "DB not connected" });
      }

      const fileName = `${uid}_${Date.now()}_${file.originalname || 'recording.m4a'}`;
      const destPath = `evidence/${uid}/${fileName}`;
      let fileUrl = null;

      logEvent("INFO", "☁️ [UPLOAD] Uploading to Firebase Storage", { fileName, destPath });

      if (bucket) {
        try {
          // Upload file to Firebase Storage
          const [uploadedFile] = await bucket.upload(file.path, { 
            destination: destPath, 
            metadata: { 
              contentType: file.mimetype,
              metadata: {
                firebaseStorageDownloadTokens: require('crypto').randomBytes(16).toString('hex')
              }
            },
            public: true // Make file publicly accessible
          });
          
          // Generate public download URL
          await uploadedFile.makePublic();
          fileUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`;
          
          logEvent("INFO", "✅ [UPLOAD] Firebase Storage upload successful", { fileUrl });
        } catch (storageError) {
          logEvent("ERROR", `❌ [UPLOAD] Firebase Storage upload failed`, { 
            error: storageError.message,
            stack: storageError.stack 
          });
          
          // Keep local file as fallback and serve it via backend
          const localFileName = path.basename(file.path);
          const localDir = path.join(__dirname, "..", "..", "uploads", "evidence");
          
          // Create evidence directory if it doesn't exist
          if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, { recursive: true });
          }
          
          // Move file to evidence directory
          const localPath = path.join(localDir, localFileName);
          fs.renameSync(file.path, localPath);
          
          // Return backend URL for local file
          fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/evidence/${localFileName}`;
          logEvent("WARN", "⚠️ [UPLOAD] Using local file storage", { fileUrl });
        }
      } else {
        logEvent("ERROR", "❌ [UPLOAD] No bucket configured");
        
        // Keep local file and serve it via backend
        const localFileName = path.basename(file.path);
        const localDir = path.join(__dirname, "..", "..", "uploads", "evidence");
        
        // Create evidence directory if it doesn't exist
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        
        // Move file to evidence directory
        const localPath = path.join(localDir, localFileName);
        fs.renameSync(file.path, localPath);
        
        // Return backend URL for local file
        fileUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/evidence/${localFileName}`;
        logEvent("INFO", "📁 [UPLOAD] Using local file storage", { fileUrl });
      }

      const crypto = require("crypto");
      let fileHash = evidenceHash || "unavailable";
      
      // If no hash provided from client, generate one
      if (!evidenceHash && file.path) {
        try {
          const fileBuffer = await fs.promises.readFile(file.path);
          fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
          logEvent("INFO", "🔐 [UPLOAD] Generated file hash on server", { hash: fileHash.substring(0, 16) + '...' });
        } catch (hashErr) {
          logEvent("WARN", "⚠️ [UPLOAD] Evidence hashing failed", { error: hashErr.message });
        }
      } else {
        logEvent("INFO", "🔐 [UPLOAD] Using client-provided hash", { hash: fileHash.substring(0, 16) + '...' });
      }

      logEvent("INFO", "💾 [UPLOAD] Saving to Firestore", { 
        collection: `users/${uid}/recordings`,
        fileName,
        type,
        reason
      });

      const docRef = await db.collection("users").doc(uid).collection("recordings").add({
        fileName, 
        fileUrl, 
        type, 
        reason, 
        size: file.size, 
        mimeType: file.mimetype, 
        fileHash,
        evidenceHash: fileHash, // Store hash in both fields for compatibility
        createdAt: new Date(),
      });
      
      logEvent("INFO", "✅ [UPLOAD] Firestore save successful", { docId: docRef.id });

      // Store evidence hash on blockchain
      let blockchainResult = null;
      try {
        const blockchainService = require('../../services/blockchainService');
        if (blockchainService.isBlockchainAvailable()) {
          logEvent("INFO", "⛓️ [BLOCKCHAIN] Storing evidence on-chain", { evidenceId: docRef.id });
          
          blockchainResult = await blockchainService.storeEvidenceOnChain(
            docRef.id,
            fileHash,
            type || 'audio',
            {
              fileName,
              reason: reason || 'Evidence',
              timestamp: new Date().toISOString(),
              uid
            }
          );

          // Update Firestore with blockchain transaction hash
          await docRef.update({
            blockchainTxHash: blockchainResult.txHash,
            blockchainVerified: true,
            blockchainTimestamp: new Date(),
            explorerUrl: blockchainResult.explorerUrl
          });

          logEvent("INFO", "✅ [BLOCKCHAIN] Evidence stored on-chain", {
            txHash: blockchainResult.txHash,
            explorerUrl: blockchainResult.explorerUrl
          });
        } else {
          logEvent("WARNING", "⛓️ [BLOCKCHAIN] Service not available - skipping on-chain storage");
        }
      } catch (blockchainError) {
        logEvent("ERROR", "❌ [BLOCKCHAIN] Failed to store on-chain", {
          error: blockchainError.message,
          evidenceId: docRef.id
        });
        // Don't fail the upload if blockchain storage fails
      }
      
      await saveAlert(uid, `📁 Evidence uploaded: ${fileName} (${type})`, 0, "evidence");

      // Clean up temp file only if successfully uploaded to Firebase
      if (fileUrl.startsWith("https://storage.googleapis.com") && fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path).catch(() => {});
        logEvent("INFO", "🗑️ [UPLOAD] Cleaned up temp file");
      }

      logEvent("INFO", "📡 [UPLOAD] Emitting socket events", { 
        userRoom: `user:${uid}`,
        adminRoom: 'admin'
      });

      io.to(`user:${uid}`).emit("evidence_uploaded", { uid, type, fileUrl, fileHash, timestamp: new Date() });
      io.to("admin").emit("evidence_uploaded", { uid, type, fileUrl, fileHash, timestamp: new Date() });

      logEvent("INFO", "✅ [UPLOAD] Evidence upload complete!", { fileName, fileUrl });

      res.status(200).json({ success: true, message: "Evidence Uploaded Successfully", fileName, fileUrl, fileHash });
    } catch (error) {
      if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
      logEvent("ERROR", "❌ [UPLOAD] upload-evidence failed", { error: error.message, stack: error.stack });
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

  router.delete("/recording/:uid/:recordingId", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      logEvent("INFO", "🗑️ [DELETE] Delete recording request", { 
        uid: req.params.uid, 
        recordingId: req.params.recordingId 
      });

      if (!db) {
        logEvent("ERROR", "❌ [DELETE] Database not connected");
        return res.status(500).json({ success: false, message: "DB not connected" });
      }

      const { uid, recordingId } = req.params;

      // Get recording details before deleting
      const recordingDoc = await db.collection("users").doc(uid).collection("recordings").doc(recordingId).get();
      
      if (!recordingDoc.exists) {
        logEvent("WARN", "⚠️ [DELETE] Recording not found", { uid, recordingId });
        return res.status(404).json({ success: false, message: "Recording not found" });
      }

      const recordingData = recordingDoc.data();
      const fileUrl = recordingData.fileUrl;
      const fileName = recordingData.fileName;

      logEvent("INFO", "📋 [DELETE] Recording details", { 
        fileName, 
        fileUrl,
        type: recordingData.type 
      });

      // Delete from Firestore
      await db.collection("users").doc(uid).collection("recordings").doc(recordingId).delete();
      logEvent("INFO", "✅ [DELETE] Deleted from Firestore");

      // Delete from Firebase Storage if it's a Firebase URL
      if (bucket && fileUrl && fileUrl.includes('storage.googleapis.com')) {
        try {
          // Extract file path from URL
          const urlParts = fileUrl.split('/');
          const bucketIndex = urlParts.findIndex(part => part.includes('.appspot.com'));
          if (bucketIndex !== -1) {
            const filePath = urlParts.slice(bucketIndex + 1).join('/');
            const file = bucket.file(filePath);
            await file.delete();
            logEvent("INFO", "✅ [DELETE] Deleted from Firebase Storage", { filePath });
          }
        } catch (storageError) {
          logEvent("WARN", "⚠️ [DELETE] Firebase Storage delete failed", { error: storageError.message });
          // Continue even if storage delete fails
        }
      }

      // Delete from local storage if it's a local URL
      if (fileUrl && fileUrl.includes('/uploads/evidence/')) {
        try {
          const localFileName = fileUrl.split('/').pop();
          const localPath = path.join(__dirname, "..", "..", "uploads", "evidence", localFileName);
          
          if (fs.existsSync(localPath)) {
            await fs.promises.unlink(localPath);
            logEvent("INFO", "✅ [DELETE] Deleted from local storage", { localPath });
          }
        } catch (localError) {
          logEvent("WARN", "⚠️ [DELETE] Local file delete failed", { error: localError.message });
          // Continue even if local delete fails
        }
      }

      // Emit socket event
      io.to(`user:${uid}`).emit("evidence_deleted", { uid, recordingId, fileName, timestamp: new Date() });
      io.to("admin").emit("evidence_deleted", { uid, recordingId, fileName, timestamp: new Date() });

      logEvent("INFO", "✅ [DELETE] Recording deleted successfully", { uid, recordingId, fileName });

      res.status(200).json({ 
        success: true, 
        message: "Recording deleted successfully",
        recordingId,
        fileName
      });
    } catch (error) {
      logEvent("ERROR", "❌ [DELETE] Delete recording failed", { error: error.message, stack: error.stack });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Blockchain verification endpoint
  router.get("/recording/:uid/:recordingId/verify", requireAuth, async (req, res) => {
    try {
      const { uid, recordingId } = req.params;
      
      logEvent("INFO", "🔍 [BLOCKCHAIN] Verifying evidence", { uid, recordingId });

      // Get recording from Firestore
      const doc = await db.collection("users").doc(uid).collection("recordings").doc(recordingId).get();
      
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: "Recording not found" });
      }

      const recording = doc.data();
      
      // Check if blockchain verification is available
      const blockchainService = require('../../services/blockchainService');
      if (!blockchainService.isBlockchainAvailable()) {
        return res.status(200).json({
          success: true,
          verified: false,
          message: "Blockchain service not available",
          localHash: recording.fileHash || recording.evidenceHash,
          blockchainVerified: false
        });
      }

      // Verify on blockchain
      const verificationResult = await blockchainService.verifyEvidenceOnChain(
        recordingId,
        recording.fileHash || recording.evidenceHash
      );

      logEvent("INFO", verificationResult.verified ? "✅ [BLOCKCHAIN] Verified" : "❌ [BLOCKCHAIN] Mismatch", {
        recordingId,
        verified: verificationResult.verified
      });

      res.status(200).json({
        success: true,
        ...verificationResult,
        localHash: recording.fileHash || recording.evidenceHash,
        fileName: recording.fileName,
        createdAt: recording.createdAt
      });

    } catch (error) {
      logEvent("ERROR", "❌ [BLOCKCHAIN] Verification failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Get blockchain network info
  router.get("/blockchain/info", requireAuth, async (req, res) => {
    try {
      const blockchainService = require('../../services/blockchainService');
      
      if (!blockchainService.isBlockchainAvailable()) {
        return res.status(200).json({
          success: true,
          available: false,
          message: "Blockchain service not configured"
        });
      }

      const networkInfo = await blockchainService.getNetworkInfo();
      
      res.status(200).json({
        success: true,
        available: true,
        ...networkInfo
      });

    } catch (error) {
      logEvent("ERROR", "Failed to get blockchain info", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
};
