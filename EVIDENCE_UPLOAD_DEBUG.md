# Evidence Upload Debugging Guide

## Problem
Recording shows status messages ("🔴 Recording audio evidence...") but evidence is NOT appearing in Evidence Vault after SOS alert.

## Changes Made

### 1. Frontend Logging (useSOSAlertSystem.ts)
Added comprehensive logging with `[UPLOAD]` prefix to track:
- ✅ Recording start/stop
- ✅ File URI and existence check
- ✅ User authentication status
- ✅ File info (size, exists)
- ✅ Hash generation
- ✅ FormData contents
- ✅ Upload request details
- ✅ Response status and body
- ✅ Callback execution

### 2. Backend Logging (recordingController.js)
Added detailed logging with `[UPLOAD]` prefix to track:
- ✅ Request received
- ✅ File received (name, size, mime type)
- ✅ Firebase Storage upload
- ✅ Hash generation/validation
- ✅ Firestore save operation
- ✅ Socket.io event emission
- ✅ Complete success/failure

### 3. Evidence Vault Logging (index.tsx)
Added logging with `[VAULT]` prefix to track:
- ✅ Fetch recordings API calls
- ✅ Socket.io event reception
- ✅ Recording formatting
- ✅ Vault refresh triggers

## How to Test

### Step 1: Start Backend Server
```bash
cd backend
npm start
```

### Step 2: Start Frontend App
```bash
npm start
```

### Step 3: Trigger SOS Alert
1. Open the app on your device/emulator
2. Tap the SOS button
3. Wait for the 40-second alert sequence OR click "I AM SAFE" or "I AM NOT SAFE"

### Step 4: Check Logs

#### Frontend Logs (Metro Bundler)
Look for these log sequences:

**Recording Start:**
```
📹 Evidence recording started
🔴 Recording audio evidence...
```

**Recording Stop & Upload:**
```
🔍 [UPLOAD] Starting stopAndUploadEvidence...
📊 [UPLOAD] Recording status before stop: {...}
✅ [UPLOAD] Recording stopped. Duration: Xs, URI: file://...
👤 [UPLOAD] User ID: xxx
🔑 [UPLOAD] Token available: true
📁 [UPLOAD] File info: {"exists":true,"size":...}
🔐 [UPLOAD] Evidence hash generated: abc123...
📤 [UPLOAD] Sending to: http://localhost:3000/upload-evidence
📤 [UPLOAD] FormData fields: {...}
📥 [UPLOAD] Response status: 200
📥 [UPLOAD] Response ok: true
📥 [UPLOAD] Response body: {"success":true,...}
✅ [UPLOAD] Evidence uploaded successfully!
🔄 [UPLOAD] Calling onEvidenceUploaded callback...
```

**Vault Refresh:**
```
📡 [VAULT] Received evidence_uploaded event: {...}
🔄 [VAULT] Refreshing vault...
📥 [VAULT] Fetching recordings for user: xxx
📥 [VAULT] API response: {"success":true,"recordings":[...]}
✅ [VAULT] Received X recordings
✅ [VAULT] Formatted recordings: [...]
```

#### Backend Logs (Terminal or logs/YYYY-MM-DD.log)
Look for these log sequences:

```json
{"tag":"INFO","message":"📤 [UPLOAD] Evidence upload request received"}
{"tag":"INFO","message":"📤 [UPLOAD] Request body fields","uid":"xxx","type":"audio",...}
{"tag":"INFO","message":"📤 [UPLOAD] File received","hasFile":true,"fileName":"sos_audio_..."}
{"tag":"INFO","message":"☁️ [UPLOAD] Uploading to Firebase Storage",...}
{"tag":"INFO","message":"✅ [UPLOAD] Firebase Storage upload successful",...}
{"tag":"INFO","message":"🔐 [UPLOAD] Using client-provided hash",...}
{"tag":"INFO","message":"💾 [UPLOAD] Saving to Firestore",...}
{"tag":"INFO","message":"✅ [UPLOAD] Firestore save successful","docId":"xxx"}
{"tag":"INFO","message":"📡 [UPLOAD] Emitting socket events",...}
{"tag":"INFO","message":"✅ [UPLOAD] Evidence upload complete!"}
```

## Common Issues to Look For

### Issue 1: No Upload Attempt
**Symptoms:** No `[UPLOAD]` logs appear
**Possible Causes:**
- Recording never started
- `stopAndUploadEvidence` not being called
- Check if `audioRecorderRef.current` is null

### Issue 2: Upload Fails
**Symptoms:** See `❌ [UPLOAD]` error logs
**Possible Causes:**
- Network error (check BASE_URL)
- Authentication error (check token)
- File doesn't exist (check URI)
- Backend error (check backend logs)

### Issue 3: Upload Succeeds but Vault Doesn't Refresh
**Symptoms:** See `✅ [UPLOAD]` but no `[VAULT]` logs
**Possible Causes:**
- Socket.io not connected
- `onEvidenceUploaded` callback not provided
- Socket event not emitted from backend

### Issue 4: Vault Refresh Fails
**Symptoms:** See `[VAULT]` logs but no recordings appear
**Possible Causes:**
- API returns empty array
- Firestore query issue
- Formatting error

## Quick Fixes

### If recording doesn't start:
- Check microphone permissions
- Check audio mode settings
- Verify `startEvidenceRecording` is called

### If upload fails:
- Verify backend is running on correct port
- Check network connectivity
- Verify user is logged in
- Check Firebase configuration

### If vault doesn't refresh:
- Check socket.io connection
- Manually open vault to trigger fetch
- Check Firestore collection path: `users/{uid}/recordings`

## Testing Checklist

- [ ] Backend server is running
- [ ] Frontend app is running
- [ ] User is logged in
- [ ] Microphone permission granted
- [ ] Trigger SOS alert
- [ ] See recording status messages
- [ ] See upload logs in frontend
- [ ] See upload logs in backend
- [ ] See vault refresh logs
- [ ] Open Evidence Vault
- [ ] See new recording appear
- [ ] Click 🔐 icon to see hash

## Next Steps

After testing with these logs, we'll know exactly where the flow breaks:
1. If no `[UPLOAD]` logs → Recording not stopping properly
2. If `[UPLOAD]` errors → Network/auth/file issue
3. If backend doesn't receive → Network/CORS issue
4. If Firestore save fails → Database permission issue
5. If socket event not received → Socket.io connection issue
6. If vault doesn't refresh → Frontend state issue

Share the logs and we'll fix the exact issue!
