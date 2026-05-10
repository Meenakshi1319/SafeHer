# SafeHer API Documentation

## Base URL
```
Development: http://localhost:5000
Production: https://api.safeher.com
```

## Authentication

All API endpoints (except health checks) require Firebase JWT authentication.

**Header:**
```
Authorization: Bearer <firebase_id_token>
```

**Getting a token:**
```javascript
const token = await auth.currentUser?.getIdToken();
```

---

## Health Check Endpoints

### GET /health
Basic health check - returns 200 if server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-10T12:00:00.000Z",
  "uptime": 3600.5,
  "environment": "production"
}
```

### GET /health/ready
Readiness check - validates all dependencies (Firebase, Firestore, Storage).

**Response (Healthy):**
```json
{
  "status": "ready",
  "timestamp": "2026-05-10T12:00:00.000Z",
  "checks": {
    "server": "ok",
    "firebase": "ok",
    "firestore": "ok",
    "storage": "ok"
  }
}
```

**Response (Unhealthy):**
```json
{
  "status": "not_ready",
  "timestamp": "2026-05-10T12:00:00.000Z",
  "checks": {
    "server": "ok",
    "firebase": "ok",
    "firestore": "ok",
    "storage": "not_configured"
  }
}
```

### GET /health/live
Liveness check - returns process status and memory usage.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2026-05-10T12:00:00.000Z",
  "pid": 12345,
  "memory": {
    "rss": 52428800,
    "heapTotal": 18874368,
    "heapUsed": 12345678,
    "external": 1234567
  }
}
```

---

## Authentication Endpoints

### POST /signup
Create a new user profile in Firestore (after Firebase Auth registration).

**Request Body:**
```json
{
  "uid": "firebase_user_id",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+911234567890",
  "emergencyContacts": [
    {
      "name": "Mom",
      "phone": "+919876543210",
      "type": "family"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile Created Successfully",
  "uid": "firebase_user_id"
}
```

**Validation:**
- `uid`: Required, alphanumeric + dashes/underscores, 1-128 chars
- `name`: Required, string
- `email`: Required, valid email format
- `phone`: Optional, E.164 format (+[country code][number])

### POST /login
Verify Firebase ID token and update last login timestamp.

**Request Body:**
```json
{
  "idToken": "firebase_id_token_from_client"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login Successful",
  "uid": "firebase_user_id",
  "email": "jane@example.com"
}
```

### POST /logout
Revoke all refresh tokens for a user (forces re-authentication).

**Request Body:**
```json
{
  "uid": "firebase_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Emergency Contact Endpoints

### POST /contacts/:uid
Add a new emergency contact.

**URL Parameters:**
- `uid`: User ID

**Request Body:**
```json
{
  "name": "Sister",
  "phone": "+911234567890",
  "type": "family"
}
```

**Valid Contact Types:**
- `family` - Family members
- `trusted` - Trusted friends
- `volunteer` - Community volunteers
- `ngo` - NGO workers
- `police` - Police contacts
- `emergency` - Emergency services

**Response:**
```json
{
  "success": true,
  "message": "Contact added",
  "contactId": "generated_contact_id"
}
```

**Validation:**
- `name`: Required, max 100 chars
- `phone`: Required, E.164 format (+[country code][number])
- `type`: Optional, must be one of valid types

### GET /contacts/:uid
Fetch all emergency contacts for a user.

**URL Parameters:**
- `uid`: User ID

**Response:**
```json
{
  "success": true,
  "contacts": [
    {
      "id": "contact_id_1",
      "name": "Mom",
      "phone": "+919876543210",
      "type": "family",
      "createdAt": "2026-05-10T12:00:00.000Z"
    }
  ]
}
```

### DELETE /contacts/:uid/:cid
Delete an emergency contact.

**URL Parameters:**
- `uid`: User ID
- `cid`: Contact ID

**Response:**
```json
{
  "success": true,
  "message": "Contact deleted"
}
```

---

## SOS & Emergency Endpoints

### POST /trigger-sos
Trigger full emergency escalation (sends SMS, saves to Firestore, emits Socket.io events).

**Request Body:**
```json
{
  "uid": "firebase_user_id",
  "reason": "Manual SOS Button",
  "riskScore": 100,
  "location": {
    "lat": 17.385044,
    "lng": 78.486671
  },
  "sessionId": "1715342400000_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SOS triggered",
  "riskLevel": "VERY HIGH",
  "contactsNotified": 8
}
```

**Rate Limit:** 10 requests per 15 minutes per UID

### POST /sos-cancel
Cancel an active SOS session (notifies contacts that user is safe).

**Request Body:**
```json
{
  "uid": "firebase_user_id",
  "sessionId": "1715342400000_abc123",
  "reason": "safe",
  "timestamp": "2026-05-10T12:00:00.000Z"
}
```

**Valid Reasons:**
- `safe` - User confirmed they are safe
- `cancelled` - User cancelled the SOS

**Response:**
```json
{
  "success": true,
  "message": "SOS cancelled, contacts notified"
}
```

---

## Risk Score Endpoints

### POST /update-risk
Add risk points to a user's score (triggers escalation if threshold crossed).

**Request Body:**
```json
{
  "uid": "firebase_user_id",
  "value": 20,
  "reason": "Phone Shake Detected",
  "source": "shake",
  "location": {
    "lat": 17.385044,
    "lng": 78.486671
  }
}
```

**Valid Sources:**
- `shake` - Accelerometer shake detection
- `sound` - Loud sound detection
- `voice` - Voice keyword detection
- `manual` - Manual risk increase
- `ai_sensor` - AI-based sensor fusion
- `system` - System-generated

**Response:**
```json
{
  "success": true,
  "riskScore": 45,
  "riskLevel": "MEDIUM",
  "delta": 20,
  "escalated": true
}
```

**Risk Levels:**
- `0-30`: LOW (no alerts)
- `31-60`: MEDIUM (family + trusted contacts)
- `61-85`: HIGH (+ volunteers + NGO)
- `86-100`: VERY HIGH (+ police + emergency services)

**Validation:**
- `value`: Required, 0-100
- `reason`: Required, max 500 chars
- `source`: Optional, must be one of valid sources

### GET /risk/:uid
Get current risk score for a user.

**URL Parameters:**
- `uid`: User ID

**Response:**
```json
{
  "success": true,
  "riskScore": 45,
  "riskLevel": "MEDIUM",
  "lastUpdated": "2026-05-10T12:00:00.000Z"
}
```

### POST /reset-risk
Reset risk score to 0 (user confirmed safe).

**Request Body:**
```json
{
  "uid": "firebase_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Risk score reset to 0"
}
```

---

## Sensor Event Endpoints

### POST /sensor/shake
Record a shake detection event.

**Request Body:**
```json
{
  "uid": "firebase_user_id",
  "intensity": 8.5,
  "location": {
    "lat": 17.385044,
    "lng": 78.486671
  }
}
```

**Response:**
```json
{
  "success": true,
  "riskScore": 20,
  "riskLevel": "LOW",
  "message": "Shake event recorded"
}
```

**Risk Delta:** +20 points

### POST /sensor/sound
Record a loud sound detection event.

**Request Body:**
```json
{
  "uid": "firebase_user_id",
  "decibels": 95,
  "location": {
    "lat": 17.385044,
    "lng": 78.486671
  }
}
```

**Response:**
```json
{
  "success": true,
  "riskScore": 25,
  "riskLevel": "LOW",
  "message": "Sound event recorded"
}
```

**Risk Delta:** +25 points

### POST /sensor/voice
Record a voice keyword detection event.

**Request Body:**
```json
{
  "uid": "firebase_user_id",
  "transcript": "help me",
  "confidence": 0.95,
  "location": {
    "lat": 17.385044,
    "lng": 78.486671
  }
}
```

**Response:**
```json
{
  "success": true,
  "riskScore": 40,
  "riskLevel": "MEDIUM",
  "message": "Voice trigger detected"
}
```

**Risk Delta:** +40 points

---

## Location Endpoints

### POST /save-location
Save user's current GPS coordinates.

**Request Body:**
```json
{
  "uid": "firebase_user_id",
  "latitude": 17.385044,
  "longitude": 78.486671,
  "sessionId": "1715342400000_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location saved"
}
```

**Validation:**
- `latitude`: Required, -90 to 90
- `longitude`: Required, -180 to 180

---

## Evidence Recording Endpoints

### POST /upload-evidence
Upload audio/video evidence file to Firebase Storage.

**Request:**
- Content-Type: `multipart/form-data`
- Max file size: 25 MB

**Form Fields:**
```
uid: firebase_user_id
type: "audio" | "video"
reason: "SOS Audio Recording"
file: <binary file data>
```

**Supported Formats:**
- Video: mp4, mov, avi, mkv, webm
- Audio: mp3, wav, aac, m4a

**Response:**
```json
{
  "success": true,
  "message": "Evidence uploaded",
  "fileName": "audio_1715342400000.m4a",
  "fileUrl": "https://storage.googleapis.com/...",
  "size": 2048576
}
```

### GET /recordings/:uid
Get all evidence recordings for a user.

**URL Parameters:**
- `uid`: User ID

**Response:**
```json
{
  "success": true,
  "recordings": [
    {
      "id": "recording_id_1",
      "filename": "audio_1715342400000.m4a",
      "fileUrl": "https://storage.googleapis.com/...",
      "type": "audio",
      "reason": "SOS Audio Recording",
      "size": 2048576,
      "createdAt": "2026-05-10T12:00:00.000Z"
    }
  ]
}
```

---

## AI Chatbot Endpoints

### POST /ai/chat
Send a message to the AI safety chatbot.

**Request Body:**
```json
{
  "message": "I feel unsafe right now. What should I do?",
  "history": [
    {
      "role": "user",
      "text": "Previous message"
    },
    {
      "role": "model",
      "text": "Previous response"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "reply": "I understand you're feeling unsafe. Here are immediate steps you can take:\n\n1. Move to a well-lit, public area if possible\n2. Call a trusted contact or emergency services\n3. Use the SOS button in SafeHer to alert your emergency contacts\n4. Stay calm and aware of your surroundings\n\nAre you in immediate danger? If yes, please call 100 (police) or 112 (emergency) right away."
}
```

**Rate Limit:** Subject to Gemini API quota (free tier: 60 requests/minute)

---

## User Profile Endpoints

### GET /user/:uid
Get user profile from Firestore.

**URL Parameters:**
- `uid`: User ID

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "firebase_user_id",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+911234567890",
    "createdAt": "2026-05-01T12:00:00.000Z",
    "lastLoginAt": "2026-05-10T12:00:00.000Z"
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## WebSocket Events (Socket.io)

### Client → Server

**Register:**
```javascript
socket.emit('register', {
  uid: 'firebase_user_id',
  token: 'firebase_id_token'
});
```

### Server → Client

**Risk Update:**
```javascript
socket.on('risk_update', (data) => {
  // data: { uid, score, riskLevel, emoji, reason }
});
```

**SOS Alert:**
```javascript
socket.on('sos_alert', (data) => {
  // data: { uid, reason, score, riskLevel, emoji, location, timestamp }
});
```

**Start Recording:**
```javascript
socket.on('start_recording', (data) => {
  // data: { uid, reason, score }
});
```

**Risk Sync:**
```javascript
socket.on('risk_sync', (data) => {
  // data: { uid, score, riskLevel }
});
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 15 minutes |
| POST /trigger-sos | 10 requests | 15 minutes |
| POST /ai/chat | 60 requests | 1 minute |

Rate limits are enforced per:
- **General:** IP address
- **SOS:** User ID (UID)
- **AI Chat:** Gemini API quota

---

## Testing

### Integration Test Suite
```bash
cd backend
node test_integration.js
```

**Test Coverage:**
- ✅ POST /signup
- ✅ GET /user/:uid
- ✅ POST /contacts/:uid
- ✅ GET /contacts/:uid
- ✅ DELETE /contacts/:uid/:cid
- ✅ POST /save-location
- ✅ POST /update-risk
- ✅ GET /risk/:uid
- ✅ POST /sensor/shake

### Unit Tests
```bash
cd backend
npm run test:unit
```

---

## Security

### Authentication
- All endpoints require Firebase JWT token (except health checks)
- Tokens verified server-side using Firebase Admin SDK
- Tokens expire after 1 hour (refresh required)

### Authorization
- Users can only access their own data
- `requireSelfOrAdmin` middleware enforces ownership
- Firestore security rules provide additional layer

### Input Validation
- All inputs validated and sanitized
- Phone numbers must be E.164 format
- Coordinates validated against valid ranges
- Risk scores capped at 0-100

### Rate Limiting
- Prevents abuse and DoS attacks
- SOS endpoints have stricter limits
- Returns 429 status when exceeded

### Data Encryption
- HTTPS/TLS 1.3 for all API traffic
- WSS for Socket.io connections
- Firebase encrypts data at rest

---

## Support

- **Documentation:** https://github.com/yourusername/safeher/wiki
- **Issues:** https://github.com/yourusername/safeher/issues
- **Email:** support@safeher.app
