# Quick Start - Evidence Upload Testing

## 🚀 Start Servers

### Terminal 1 - Backend
```bash
cd backend
npm start
```
Wait for: `Server running on port 3000`

### Terminal 2 - Frontend
```bash
npm start
```
Then press `a` (Android) or `i` (iOS)

## 📱 Test on Device

1. **Login** to the app
2. **Tap SOS button** on home screen
3. **Wait 40 seconds** OR click "I AM SAFE"
4. **Watch the logs** in both terminals

## 👀 What to Look For

### Frontend Terminal (Metro Bundler)
```
✅ GOOD: See these logs
📹 Evidence recording started
🔍 [UPLOAD] Starting stopAndUploadEvidence...
✅ [UPLOAD] Recording stopped
📤 [UPLOAD] Sending to: http://...
📥 [UPLOAD] Response status: 200
✅ [UPLOAD] Evidence uploaded successfully!
📡 [VAULT] Received evidence_uploaded event
✅ [VAULT] Received 1 recordings

❌ BAD: See these logs
❌ [UPLOAD] No recording URI available
❌ [UPLOAD] Recording file does not exist
❌ [UPLOAD] Upload failed: Network request failed
❌ [UPLOAD] Response status: 401/500
```

### Backend Terminal
```
✅ GOOD: See these logs
{"tag":"INFO","message":"📤 [UPLOAD] Evidence upload request received"}
{"tag":"INFO","message":"📤 [UPLOAD] File received","hasFile":true}
{"tag":"INFO","message":"✅ [UPLOAD] Firebase Storage upload successful"}
{"tag":"INFO","message":"✅ [UPLOAD] Firestore save successful"}
{"tag":"INFO","message":"✅ [UPLOAD] Evidence upload complete!"}

❌ BAD: See these logs
{"tag":"ERROR","message":"❌ [UPLOAD] No file in request"}
{"tag":"ERROR","message":"❌ [UPLOAD] Database not connected"}
{"tag":"ERROR","message":"❌ [UPLOAD] upload-evidence failed"}
```

## ✅ Verify Success

1. Scroll down to **Evidence Vault** on home screen
2. Tap to expand
3. Should see new recording:
   - 🎙️ SOS Emergency Recording
   - Date/time stamp
   - File size
   - 🔐 icon (tap to see hash)

## 🐛 Common Issues

### Issue: No logs appear
**Fix:** Check if backend is running on correct port

### Issue: Network request failed
**Fix:** Check BASE_URL in `src/core/api/client.ts`

### Issue: 401 Unauthorized
**Fix:** User not logged in or token expired

### Issue: Recording file not found
**Fix:** Check microphone permissions

### Issue: Vault doesn't refresh
**Fix:** Check socket.io connection

## 📚 Full Documentation

- `EVIDENCE_UPLOAD_FIX_SUMMARY.md` - Complete overview
- `TESTING_INSTRUCTIONS.md` - Detailed testing guide
- `EVIDENCE_UPLOAD_DEBUG.md` - Debugging guide

## 🆘 Need Help?

Share these logs:
1. Complete frontend logs (Metro Bundler)
2. Complete backend logs (Terminal)
3. Screenshot of Evidence Vault
4. Firebase Console screenshots

## 🎯 Success Criteria

✅ Recording starts
✅ Status messages appear
✅ Upload logs show success
✅ Backend receives file
✅ Firestore saves document
✅ Socket event emitted
✅ Vault refreshes
✅ Recording appears in vault
✅ Hash is visible

That's it! Test and share the logs if issues persist.
