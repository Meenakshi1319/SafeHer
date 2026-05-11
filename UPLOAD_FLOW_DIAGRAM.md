# Evidence Upload Flow Diagram

## Complete Upload Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER TRIGGERS SOS                            │
│                    (Button / Shake / Voice)                          │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    START ALERT SEQUENCE                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. triggerAlert() called                                      │  │
│  │ 2. startEvidenceRecording() → Start audio recording          │  │
│  │    📹 "Evidence recording started"                            │  │
│  │    🔴 "Recording audio evidence..."                           │  │
│  │ 3. playAlertSound() → Play siren + vibration                 │  │
│  │ 4. Start 40-second countdown                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌───────────────────┐    ┌───────────────────┐
        │  User clicks      │    │  40 seconds       │
        │  "I AM SAFE" or   │    │  elapsed          │
        │  "I AM NOT SAFE"  │    │  (no response)    │
        └─────────┬─────────┘    └─────────┬─────────┘
                  │                         │
                  └────────────┬────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  STOP RECORDING & UPLOAD                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. stopAndUploadEvidence() called                             │  │
│  │    🔍 "[UPLOAD] Starting stopAndUploadEvidence..."           │  │
│  │                                                                │  │
│  │ 2. Stop audio recording                                       │  │
│  │    📊 "[UPLOAD] Recording status before stop"                │  │
│  │    ✅ "[UPLOAD] Recording stopped. Duration: Xs"             │  │
│  │                                                                │  │
│  │ 3. Validate recording                                         │  │
│  │    👤 "[UPLOAD] User ID: xxx"                                 │  │
│  │    🔑 "[UPLOAD] Token available: true"                        │  │
│  │    📁 "[UPLOAD] File info: {exists:true, size:...}"          │  │
│  │                                                                │  │
│  │ 4. Generate hash                                              │  │
│  │    🔐 "[UPLOAD] Evidence hash generated: abc123..."          │  │
│  │                                                                │  │
│  │ 5. Create FormData                                            │  │
│  │    📤 "[UPLOAD] FormData fields: {uid, type, reason, ...}"   │  │
│  │                                                                │  │
│  │ 6. Send HTTP POST to backend                                  │  │
│  │    📤 "[UPLOAD] Sending to: http://x.x.x.x:3000/..."         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ HTTP POST
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND RECEIVES REQUEST                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. POST /upload-evidence                                      │  │
│  │    📤 "[UPLOAD] Evidence upload request received"            │  │
│  │    📤 "[UPLOAD] Request body fields: {uid, type, ...}"       │  │
│  │                                                                │  │
│  │ 2. Validate file                                              │  │
│  │    📤 "[UPLOAD] File received: {hasFile:true, size:...}"     │  │
│  │                                                                │  │
│  │ 3. Upload to Firebase Storage                                 │  │
│  │    ☁️ "[UPLOAD] Uploading to Firebase Storage"               │  │
│  │    ✅ "[UPLOAD] Firebase Storage upload successful"          │  │
│  │                                                                │  │
│  │ 4. Validate/Generate hash                                     │  │
│  │    🔐 "[UPLOAD] Using client-provided hash: abc123..."       │  │
│  │                                                                │  │
│  │ 5. Save to Firestore                                          │  │
│  │    💾 "[UPLOAD] Saving to Firestore"                         │  │
│  │    ✅ "[UPLOAD] Firestore save successful: docId=xyz"        │  │
│  │                                                                │  │
│  │ 6. Emit socket.io events                                      │  │
│  │    📡 "[UPLOAD] Emitting socket events"                      │  │
│  │    ✅ "[UPLOAD] Evidence upload complete!"                   │  │
│  │                                                                │  │
│  │ 7. Send HTTP response                                         │  │
│  │    {success: true, fileName: "...", fileUrl: "...", ...}     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌───────────────────┐    ┌───────────────────┐
        │  HTTP Response    │    │  Socket.io Event  │
        │  to Frontend      │    │  "evidence_       │
        │                   │    │   uploaded"       │
        └─────────┬─────────┘    └─────────┬─────────┘
                  │                         │
                  └────────────┬────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND RECEIVES RESPONSE                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 1. HTTP Response received                                     │  │
│  │    📥 "[UPLOAD] Response status: 200"                         │  │
│  │    📥 "[UPLOAD] Response ok: true"                            │  │
│  │    📥 "[UPLOAD] Response body: {success:true, ...}"          │  │
│  │    ✅ "[UPLOAD] Evidence uploaded successfully!"             │  │
│  │                                                                │  │
│  │ 2. Call onEvidenceUploaded callback                           │  │
│  │    🔄 "[UPLOAD] Calling onEvidenceUploaded callback..."      │  │
│  │                                                                │  │
│  │ 3. Socket.io event received                                   │  │
│  │    📡 "[VAULT] Received evidence_uploaded event"             │  │
│  │    🔄 "[VAULT] Refreshing vault..."                          │  │
│  │                                                                │  │
│  │ 4. Fetch recordings from API                                  │  │
│  │    📥 "[VAULT] Fetching recordings for user: xxx"            │  │
│  │    📥 "[VAULT] API response: {success:true, ...}"            │  │
│  │    ✅ "[VAULT] Received 1 recordings"                        │  │
│  │                                                                │  │
│  │ 5. Format and display recordings                              │  │
│  │    🔄 "[FORMAT] Formatting recording: {...}"                 │  │
│  │    ✅ "[FORMAT] Formatted result: {...}"                     │  │
│  │                                                                │  │
│  │ 6. Update UI state                                            │  │
│  │    setRecordings([...])                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EVIDENCE VAULT UPDATED                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🔒 Evidence Vault                                             │  │
│  │ 1 files encrypted                                             │  │
│  │                                                                │  │
│  │ ┌────────────────────────────────────────────────────────┐   │  │
│  │ │ 🎙️ SOS Emergency Recording                             │   │  │
│  │ │ 5/11/2026, 1:23:45 PM • 0.5 MB                         │   │  │
│  │ │                                            🔐           │   │  │
│  │ └────────────────────────────────────────────────────────┘   │  │
│  │                                                                │  │
│  │ + Add Evidence                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│   Frontend   │
│              │
│ Audio File   │──────┐
│ + Hash       │      │
│ + Metadata   │      │
└──────────────┘      │
                      │ FormData
                      │ (multipart/form-data)
                      │
                      ▼
              ┌──────────────┐
              │   Backend    │
              │              │
              │ Multer       │───────┐
              │ (file        │       │
              │  upload)     │       │
              └──────────────┘       │
                                     │
                      ┌──────────────┴──────────────┐
                      │                             │
                      ▼                             ▼
              ┌──────────────┐            ┌──────────────┐
              │   Firebase   │            │  Firestore   │
              │   Storage    │            │              │
              │              │            │ Document:    │
              │ File stored  │            │ - fileName   │
              │ at:          │            │ - fileUrl    │
              │ evidence/    │            │ - fileHash   │
              │ {uid}/       │            │ - type       │
              │ {filename}   │            │ - reason     │
              └──────────────┘            │ - size       │
                                          │ - createdAt  │
                                          └──────────────┘
                                                  │
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  Socket.io   │
                                          │              │
                                          │ Emit event:  │
                                          │ "evidence_   │
                                          │  uploaded"   │
                                          └──────────────┘
                                                  │
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │   Frontend   │
                                          │              │
                                          │ Refresh      │
                                          │ Evidence     │
                                          │ Vault        │
                                          └──────────────┘
```

## Logging Points

```
Frontend (useSOSAlertSystem.ts):
├─ 📹 Recording started
├─ 🔍 [UPLOAD] Starting upload
├─ 📊 [UPLOAD] Recording status
├─ ✅ [UPLOAD] Recording stopped
├─ 👤 [UPLOAD] User ID
├─ 🔑 [UPLOAD] Token available
├─ 📁 [UPLOAD] File info
├─ 🔐 [UPLOAD] Hash generated
├─ 📤 [UPLOAD] Sending request
├─ 📥 [UPLOAD] Response received
├─ ✅ [UPLOAD] Upload successful
└─ 🔄 [UPLOAD] Callback executed

Backend (recordingController.js):
├─ 📤 [UPLOAD] Request received
├─ 📤 [UPLOAD] Request body
├─ 📤 [UPLOAD] File received
├─ ☁️ [UPLOAD] Uploading to Storage
├─ ✅ [UPLOAD] Storage upload successful
├─ 🔐 [UPLOAD] Hash validated
├─ 💾 [UPLOAD] Saving to Firestore
├─ ✅ [UPLOAD] Firestore save successful
├─ 📡 [UPLOAD] Emitting socket events
└─ ✅ [UPLOAD] Upload complete

Frontend (index.tsx):
├─ 📡 [VAULT] Socket event received
├─ 🔄 [VAULT] Refreshing vault
├─ 📥 [VAULT] Fetching recordings
├─ 📥 [VAULT] API response
├─ ✅ [VAULT] Received X recordings
├─ 🔄 [FORMAT] Formatting recording
└─ ✅ [FORMAT] Formatted result
```

## Error Handling Points

```
┌─────────────────────────────────────────────────────────────┐
│ Potential Failure Points                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Recording Start                                           │
│    ❌ Microphone permission denied                          │
│    ❌ Audio mode conflict                                   │
│                                                              │
│ 2. Recording Stop                                            │
│    ❌ No active recording                                   │
│    ❌ Recording URI not available                           │
│                                                              │
│ 3. File Validation                                           │
│    ❌ File doesn't exist                                    │
│    ❌ File size is 0                                        │
│                                                              │
│ 4. Authentication                                            │
│    ❌ User not logged in                                    │
│    ❌ Token expired                                         │
│                                                              │
│ 5. Network Request                                           │
│    ❌ Network unavailable                                   │
│    ❌ Backend not reachable                                 │
│    ❌ CORS error                                            │
│                                                              │
│ 6. Backend Processing                                        │
│    ❌ File not in request                                   │
│    ❌ Multer parsing error                                  │
│                                                              │
│ 7. Firebase Storage                                          │
│    ❌ Bucket doesn't exist                                  │
│    ❌ Upload permission denied                              │
│    ❌ Storage quota exceeded                                │
│                                                              │
│ 8. Firestore                                                 │
│    ❌ Database not connected                                │
│    ❌ Write permission denied                               │
│    ❌ Document path invalid                                 │
│                                                              │
│ 9. Socket.io                                                 │
│    ❌ Socket not connected                                  │
│    ❌ Event not emitted                                     │
│    ❌ Event not received                                    │
│                                                              │
│ 10. Vault Refresh                                            │
│     ❌ API request fails                                    │
│     ❌ Invalid response format                              │
│     ❌ Formatting error                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Each failure point now has detailed logging to help identify the exact issue!
