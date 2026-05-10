/**
 * API tests for POST /upload-evidence
 *
 * Covers:
 *   - Missing file → 400
 *   - Valid audio upload (Firebase Storage mock path)
 *   - Valid video upload
 *   - Unsupported file type → 400
 *   - Storage bucket does not exist → local fallback
 *   - Storage upload throws → local fallback
 */

require("../setup");
const request = require("supertest");
const path    = require("path");
const fs      = require("fs");
const os      = require("os");
const { app, } = require("../../server");
const { mockBucket } = require("../setup");

// Create a tiny temp file to use as a fake upload
function makeTempFile(ext = ".m4a") {
  const tmpPath = path.join(os.tmpdir(), `safeher_test_${Date.now()}${ext}`);
  fs.writeFileSync(tmpPath, "fake audio data");
  return tmpPath;
}

describe("Upload Evidence Route", () => {
  test("POST /upload-evidence returns 400 when no file is attached", async () => {
    const res = await request(app)
      .post("/upload-evidence")
      .field("uid", "upload-test-uid")
      .field("type", "audio")
      .field("reason", "SOS test");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("No file uploaded");
  });

  test("POST /upload-evidence accepts a valid audio file", async () => {
    const tmpFile = makeTempFile(".m4a");

    const res = await request(app)
      .post("/upload-evidence")
      .field("uid", "upload-test-uid")
      .field("type", "audio")
      .field("reason", "SOS Audio Recording")
      .attach("file", tmpFile, "recording.m4a");

    try { fs.unlinkSync(tmpFile); } catch {}

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Evidence Uploaded Successfully");
    expect(res.body).toHaveProperty("fileName");
    expect(res.body).toHaveProperty("fileUrl");
  });

  test("POST /upload-evidence accepts a valid video file", async () => {
    const tmpFile = makeTempFile(".mp4");

    const res = await request(app)
      .post("/upload-evidence")
      .field("uid", "upload-test-uid-2")
      .field("type", "video")
      .field("reason", "SOS Video Recording")
      .attach("file", tmpFile, "recording.mp4");

    try { fs.unlinkSync(tmpFile); } catch {}

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty("fileName");
  });

  test("POST /upload-evidence rejects unsupported file types", async () => {
    const tmpFile = makeTempFile(".txt");

    const res = await request(app)
      .post("/upload-evidence")
      .field("uid", "upload-test-uid-3")
      .field("type", "audio")
      .attach("file", tmpFile, "notes.txt");

    try { fs.unlinkSync(tmpFile); } catch {}

    // Multer fileFilter rejects the file — no file in req.file → 400
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("POST /upload-evidence falls back to local storage when bucket does not exist", async () => {
    // Override bucket.exists to return false
    const originalExists = mockBucket.exists;
    mockBucket.exists = jest.fn().mockResolvedValue([false]);

    const tmpFile = makeTempFile(".m4a");

    const res = await request(app)
      .post("/upload-evidence")
      .field("uid", "upload-fallback-uid")
      .field("type", "audio")
      .field("reason", "Fallback test")
      .attach("file", tmpFile, "recording.m4a");

    try { fs.unlinkSync(tmpFile); } catch {}

    mockBucket.exists = originalExists;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Local fallback URL starts with /videos/
    expect(res.body.fileUrl).toMatch(/^\/videos\//);
  });

  test("POST /upload-evidence falls back to local storage when bucket upload throws", async () => {
    // Override bucket.upload to throw
    const originalUpload = mockBucket.upload;
    mockBucket.upload = jest.fn().mockRejectedValue(new Error("Storage quota exceeded"));

    const tmpFile = makeTempFile(".m4a");

    const res = await request(app)
      .post("/upload-evidence")
      .field("uid", "upload-error-uid")
      .field("type", "audio")
      .field("reason", "Error fallback test")
      .attach("file", tmpFile, "recording.m4a");

    try { fs.unlinkSync(tmpFile); } catch {}

    mockBucket.upload = originalUpload;

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileUrl).toMatch(/^\/videos\//);
  });
});
