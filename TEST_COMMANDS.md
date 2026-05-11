# Test Commands - Audio Playback Fix

## 🧪 Complete Testing Guide

### Step 1: Restart Backend

```bash
# Navigate to backend directory
cd backend

# Stop current server if running (Ctrl+C)

# Start backend server
node server.js
```

**Expected Output:**
```
╔══════════════════════════════════════════════════════════╗
║        🚀  SafeHer Backend running on port 5000          ║
╚══════════════════════════════════════════════════════════╝
```

**Keep this terminal open** - you'll see upload logs here.

---

### Step 2: Start Frontend (New Terminal)

```bash
# Open NEW terminal window

# Navigate to project root
cd "c:\Users\Karth\OneDrive\Desktop\SafeHer - github"

# Start Expo
npm start
```

**Or if already running:**
- Just press `r` to reload the app

---

### Step 3: Test Evidence Upload

**In the app:**
1. Tap **SOS button** on home screen
2. Wait for alert sequence (or tap "I AM NOT SAFE")
3. Watch backend terminal for logs

**Expected Backend Logs:**
```
📤 [UPLOAD] Evidence upload request received
📤 [UPLOAD] File received
☁️ [UPLOAD] Uploading to Firebase Storage
✅ [UPLOAD] Firebase Storage upload successful
fileUrl: https://storage.googleapis.com/safeher1-514a9.appspot.com/evidence/...
💾 [UPLOAD] Saving to Firestore
✅ [UPLOAD] Firestore save successful
📡 [UPLOAD] Emitting socket events
✅ [UPLOAD] Evidence upload complete!
```

**Expected App Logs:**
```
✅ [UPLOAD] Evidence uploaded successfully!
✅ [VAULT] Received 1 recordings
```

---

### Step 4: Test Audio Playback

**In the app:**
1. Scroll down to **Evidence Vault**
2. Tap **▼** to expand vault
3. You should see your recording:
   ```
   🎙️ Audio Recording
   May 11, 2026, [time] • [size] MB
   [▶️] [🔐]
   ```
4. Tap **▶️ Play button**

**Expected App Logs:**
```
▶️ [AUDIO] Playing: https://storage.googleapis.com/...
✅ [AUDIO] Playback started
```

**Expected Result:**
- ✅ Audio plays
- ✅ Play button changes to ⏹️
- ✅ Playing indicator appears
- ✅ No errors

5. Tap **⏹️ Stop button**

**Expected App Logs:**
```
⏹️ [AUDIO] Stopping playback
```

---

### Step 5: Verify No Errors

**Check backend terminal:**
- ✅ No error messages
- ✅ Upload completed successfully
- ✅ File URL is valid (starts with `https://storage.googleapis.com/`)

**Check app logs:**
- ✅ No `FileNotFoundException` errors
- ✅ No `[AUDIO] Playback error` messages
- ✅ Playback started and finished successfully

---

## 🔍 Diagnostic Commands

### Check Backend Status
```bash
# In backend directory
curl http://localhost:5000/health
```

**Expected Output:**
```json
{
  "status": "✅ SafeHer Backend is running",
  "uptime": "123s",
  "activeSessions": 1,
  "timestamp": "2026-05-11T..."
}
```

---

### Check Evidence Files (Firebase)

**Option 1: Firebase Console**
1. Go to: https://console.firebase.google.com
2. Select project: **safeher1-514a9**
3. Click **Storage** in left menu
4. Navigate to: `evidence/[your-uid]/`
5. You should see uploaded files

**Option 2: Check Firestore**
1. Go to: https://console.firebase.google.com
2. Select project: **safeher1-514a9**
3. Click **Firestore Database**
4. Navigate to: `users/[your-uid]/recordings`
5. Check `fileUrl` field - should start with `https://storage.googleapis.com/`

---

### Check Evidence Files (Local Fallback)

```bash
# In backend directory
dir uploads\evidence
```

**If Firebase failed, you'll see files here:**
```
abc123.m4a
def456.m4a
```

**Test local file access:**
```bash
# Replace [filename] with actual filename
curl http://localhost:5000/uploads/evidence/[filename].m4a --output test.m4a
```

---

### Check Backend Logs

```bash
# In backend directory
type logs\2026-05-11.log | findstr /C:"[UPLOAD]"
```

**Expected Output:**
```
{"timestamp":"...","tag":"INFO","message":"📤 [UPLOAD] Evidence upload request received"}
{"timestamp":"...","tag":"INFO","message":"✅ [UPLOAD] Firebase Storage upload successful"}
{"timestamp":"...","tag":"INFO","message":"✅ [UPLOAD] Evidence upload complete!"}
```

---

### Check App Logs for Playback

**In app console, look for:**
```
▶️ [AUDIO] Playing: [url]
✅ [AUDIO] Playback started
✅ [AUDIO] Playback finished
```

**Or for errors:**
```
❌ [AUDIO] Playback error: [error message]
```

---

## 🧪 Advanced Testing

### Test Firebase Storage Upload

```bash
# In backend directory
node -e "
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('./src/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'safeher1-514a9.appspot.com'
});

const bucket = admin.storage().bucket();

bucket.exists().then(([exists]) => {
  console.log('Bucket exists:', exists);
  console.log('Bucket name:', bucket.name);
}).catch(err => {
  console.error('Error:', err.message);
});
"
```

**Expected Output:**
```
Bucket exists: true
Bucket name: safeher1-514a9.appspot.com
```

---

### Test Local File Serving

```bash
# Create test file
echo "test audio" > backend\uploads\evidence\test.txt

# Test access
curl http://localhost:5000/uploads/evidence/test.txt
```

**Expected Output:**
```
test audio
```

---

### Test Complete Flow

```bash
# In backend directory

# 1. Check backend is running
curl http://localhost:5000/health

# 2. Check Firebase connection
node -e "console.log(require('firebase-admin').apps.length ? '✅ Firebase connected' : '❌ Firebase not connected')"

# 3. Check Twilio (SMS)
node test-twilio.js

# 4. Check contacts
node check-contacts.js opfXGBBZ4POUX4E99UXbVm1HvpL2

# 5. Watch logs in real-time
tail -f logs\2026-05-11.log
```

---

## ✅ Success Criteria

After running all tests, you should have:

### Backend:
- ✅ Server running on port 5000
- ✅ Firebase Storage connected
- ✅ Evidence files uploaded successfully
- ✅ Valid file URLs generated
- ✅ No upload errors in logs

### Frontend:
- ✅ App connected to backend
- ✅ SOS alert triggered successfully
- ✅ Evidence uploaded to vault
- ✅ Audio playback works
- ✅ No FileNotFoundException errors

### Files:
- ✅ Files in Firebase Storage: `evidence/[uid]/[filename].m4a`
- ✅ OR files in local storage: `backend/uploads/evidence/[filename].m4a`
- ✅ File URLs in Firestore: `users/[uid]/recordings`

---

## 🐛 Troubleshooting Commands

### If Backend Won't Start:

```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process if needed (replace [PID] with actual PID)
taskkill /PID [PID] /F

# Restart backend
node server.js
```

---

### If Upload Fails:

```bash
# Check Firebase credentials
dir backend\src\serviceAccountKey.json

# Check .env configuration
type backend\.env | findstr FIREBASE

# Check upload directory exists
dir backend\uploads
```

---

### If Playback Fails:

```bash
# Check file URL in database
# Go to Firebase Console → Firestore → users/[uid]/recordings
# Copy fileUrl value

# Test URL accessibility
curl [fileUrl] --output test.m4a

# Check file size
dir test.m4a
```

---

### If SMS Not Working:

```bash
# In backend directory
node send-test-sms.js +919502381087
```

---

## 📊 Complete Test Checklist

Run these in order:

```bash
# 1. Backend health check
cd backend
curl http://localhost:5000/health

# 2. Firebase connection
node -e "console.log(require('firebase-admin').apps.length ? '✅ Firebase' : '❌ Firebase')"

# 3. Twilio connection
node test-twilio.js

# 4. Contacts check
node check-contacts.js opfXGBBZ4POUX4E99UXbVm1HvpL2

# 5. SMS test
node send-test-sms.js +919502381087

# 6. Start backend (if not running)
node server.js

# 7. In NEW terminal - start frontend
cd ..
npm start

# 8. In app - trigger SOS and test playback

# 9. Check backend logs
type logs\2026-05-11.log | findstr /C:"[UPLOAD]"

# 10. Check evidence files
dir uploads\evidence
```

---

## 🎯 Quick Test (Minimal)

If you just want to test audio playback quickly:

```bash
# Terminal 1: Start backend
cd backend
node server.js

# Terminal 2: Start frontend (if not running)
cd "c:\Users\Karth\OneDrive\Desktop\SafeHer - github"
npm start

# In app:
# 1. Tap SOS
# 2. Wait or click "I AM NOT SAFE"
# 3. Open Evidence Vault
# 4. Tap ▶️ to play audio
# 5. Should work! ✅
```

---

## 📝 Expected Timeline

- **Backend restart:** 5 seconds
- **Frontend reload:** 10 seconds
- **SOS trigger:** 40 seconds (or instant with button)
- **Evidence upload:** 5-10 seconds
- **Audio playback test:** 5 seconds

**Total test time:** ~1-2 minutes

---

## 🎉 Success!

If audio plays without errors, you're done! 🚀

All evidence recording and playback features are now working correctly.
