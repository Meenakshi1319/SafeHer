# Testing Instructions - Evidence Upload Fix

## What Was Fixed

### Problem
- Recording showed status messages but evidence wasn't appearing in Evidence Vault
- Upload was failing silently with no error messages
- No way to debug where the flow was breaking

### Solution
Added comprehensive logging throughout the entire upload pipeline:

1. **Frontend (useSOSAlertSystem.ts)**
   - Detailed logging for recording start/stop
   - File validation and hash generation tracking
   - Upload request/response logging
   - Callback execution tracking

2. **Backend (recordingController.js)**
   - Request reception logging
   - File processing tracking
   - Firebase Storage upload status
   - Firestore save confirmation
   - Socket.io event emission tracking

3. **Evidence Vault (index.tsx)**
   - API fetch logging
   - Socket event reception tracking
   - Recording formatting logging

## How to Test

### Prerequisites
1. Backend server must be running
2. Firebase credentials must be configured
3. User must be logged in
4. Microphone permission must be granted

### Test Steps

#### 1. Start Backend Server
```bash
cd backend
npm start
```

**Expected Output:**
```
Server running on port 3000
Socket.IO initialized
Firebase Admin initialized
```

#### 2. Start Frontend App
```bash
npm start
```

Then press `a` for Android or `i` for iOS

#### 3. Trigger SOS Alert

**Option A: Tap SOS Button**
- Tap the red SOS button on home screen
- Wait for 40-second alert sequence
- OR click "I AM SAFE" or "I AM NOT SAFE"

**Option B: Shake Device**
- Shake device 3 times rapidly
- Alert will trigger automatically

**Option C: Voice Command**
- Say "Help me" or "Emergency"
- Alert will trigger automatically

#### 4. Monitor Logs

**Frontend Logs (Metro Bundler Terminal):**

Look for this sequence:
```
📹 Evidence recording started
🔴 Recording audio evidence...
🔍 [UPLOAD] Starting stopAndUploadEvidence...
📊 [UPLOAD] Recording status before stop: {...}
✅ [UPLOAD] Recording stopped. Duration: 40s
👤 [UPLOAD] User ID: abc123...
🔑 [UPLOAD] Token available: true
📁 [UPLOAD] File info: {"exists":true,"size":1234567}
🔐 [UPLOAD] Evidence hash generated: abc123...
📤 [UPLOAD] Sending to: http://192.168.x.x:3000/upload-evidence
📥 [UPLOAD] Response status: 200
📥 [UPLOAD] Response ok: true
✅ [UPLOAD] Evidence uploaded successfully!
🔄 [UPLOAD] Calling onEvidenceUploaded callback...
📡 [VAULT] Received evidence_uploaded event
🔄 [VAULT] Refreshing vault...
📥 [VAULT] Fetching recordings for user: abc123
✅ [VAULT] Received 1 recordings
```

**Backend Logs (Backend Terminal):**

Look for this sequence:
```json
{"tag":"INFO","message":"📤 [UPLOAD] Evidence upload request received"}
{"tag":"INFO","message":"📤 [UPLOAD] File received","hasFile":true}
{"tag":"INFO","message":"☁️ [UPLOAD] Uploading to Firebase Storage"}
{"tag":"INFO","message":"✅ [UPLOAD] Firebase Storage upload successful"}
{"tag":"INFO","message":"💾 [UPLOAD] Saving to Firestore"}
{"tag":"INFO","message":"✅ [UPLOAD] Firestore save successful"}
{"tag":"INFO","message":"📡 [UPLOAD] Emitting socket events"}
{"tag":"INFO","message":"✅ [UPLOAD] Evidence upload complete!"}
```

#### 5. Verify in Evidence Vault

1. On the home screen, scroll down to "Evidence Vault"
2. Tap to expand the vault
3. You should see a new recording:
   - 🎙️ icon for audio
   - Title: "SOS Emergency Recording"
   - Date/time stamp
   - File size
   - 🔐 icon (tap to see blockchain hash)

## Troubleshooting

### Issue 1: No Recording Starts
**Symptoms:** No "🔴 Recording audio evidence..." message

**Check:**
- Microphone permission granted?
- Audio mode set correctly?
- Any errors in console?

**Fix:**
```javascript
// Check permissions
const { status } = await Audio.requestPermissionsAsync();
console.log('Mic permission:', status);
```

### Issue 2: Recording Starts but No Upload
**Symptoms:** See "🔴 Recording..." but no `[UPLOAD]` logs

**Check:**
- Is `stopAndUploadEvidence` being called?
- Is `audioRecorderRef.current` null?

**Fix:**
- Check if alert sequence completes
- Check if buttons trigger the stop function

### Issue 3: Upload Fails
**Symptoms:** See `❌ [UPLOAD]` error logs

**Common Errors:**

**A. Network Error**
```
❌ [UPLOAD] Upload failed: Network request failed
```
**Fix:** Check BASE_URL in `src/core/api/client.ts`

**B. Authentication Error**
```
❌ [UPLOAD] Response status: 401
```
**Fix:** User not logged in or token expired

**C. File Not Found**
```
❌ [UPLOAD] Recording file does not exist
```
**Fix:** Recording URI is invalid or file was deleted

**D. Backend Error**
```
❌ [UPLOAD] Response status: 500
```
**Fix:** Check backend logs for details

### Issue 4: Upload Succeeds but Vault Doesn't Refresh
**Symptoms:** See `✅ [UPLOAD]` but no new recording in vault

**Check:**
- Socket.io connected?
- `onEvidenceUploaded` callback provided?
- Socket event emitted from backend?

**Debug:**
```javascript
// Check socket connection
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Socket disconnected');
});
```

### Issue 5: Vault Shows Loading Forever
**Symptoms:** Vault shows spinner but never loads

**Check:**
- API endpoint working?
- Firestore query correct?
- User ID valid?

**Debug:**
```bash
# Test API directly
curl http://localhost:3000/recordings/YOUR_USER_ID
```

## Success Criteria

✅ Recording starts when SOS triggered
✅ Recording status messages appear
✅ Recording stops after alert sequence
✅ Upload logs show success
✅ Backend logs show file received
✅ Backend logs show Firestore save
✅ Socket event emitted
✅ Vault refreshes automatically
✅ New recording appears in vault
✅ Can tap 🔐 to see hash

## Common Log Patterns

### Successful Upload Flow
```
Frontend: 📹 Recording started
Frontend: 🔍 [UPLOAD] Starting...
Frontend: ✅ [UPLOAD] Recording stopped
Frontend: 📤 [UPLOAD] Sending...
Backend:  📤 [UPLOAD] Request received
Backend:  📤 [UPLOAD] File received
Backend:  ✅ [UPLOAD] Upload complete
Frontend: 📥 [UPLOAD] Response: 200
Frontend: ✅ [UPLOAD] Success!
Frontend: 🔄 [UPLOAD] Callback...
Frontend: 📡 [VAULT] Event received
Frontend: 📥 [VAULT] Fetching...
Frontend: ✅ [VAULT] Received 1 recordings
```

### Failed Upload - Network Error
```
Frontend: 📹 Recording started
Frontend: 🔍 [UPLOAD] Starting...
Frontend: ✅ [UPLOAD] Recording stopped
Frontend: 📤 [UPLOAD] Sending...
Frontend: ❌ [UPLOAD] Network request failed
```

### Failed Upload - No File
```
Frontend: 📹 Recording started
Frontend: 🔍 [UPLOAD] Starting...
Frontend: ❌ [UPLOAD] No recording URI available
```

### Failed Upload - Backend Error
```
Frontend: 📹 Recording started
Frontend: 🔍 [UPLOAD] Starting...
Frontend: ✅ [UPLOAD] Recording stopped
Frontend: 📤 [UPLOAD] Sending...
Backend:  📤 [UPLOAD] Request received
Backend:  ❌ [UPLOAD] File not in request
Frontend: 📥 [UPLOAD] Response: 400
Frontend: ❌ [UPLOAD] Upload failed
```

## Next Steps

After testing:

1. **If everything works:** Remove or reduce logging verbosity
2. **If upload fails:** Share the exact error logs
3. **If vault doesn't refresh:** Check socket.io connection
4. **If Firestore fails:** Check Firebase permissions

## Additional Debug Commands

### Check Backend Health
```bash
curl http://localhost:3000/health
```

### Check User Recordings
```bash
curl http://localhost:3000/recordings/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Firebase Storage
```bash
# In Firebase Console
# Go to Storage > evidence/{uid}/
# Should see uploaded files
```

### Check Firestore
```bash
# In Firebase Console
# Go to Firestore > users > {uid} > recordings
# Should see recording documents
```

## Contact

If issues persist after following this guide, provide:
1. Complete frontend logs (from Metro Bundler)
2. Complete backend logs (from terminal or log file)
3. Screenshots of Evidence Vault
4. Firebase Console screenshots (Storage + Firestore)

This will help identify the exact point of failure!
