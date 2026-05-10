# SafeHer Architecture Documentation

## System Overview

SafeHer is a distributed safety application consisting of three main components:

1. **Mobile Client** (React Native/Expo)
2. **Backend API** (Node.js/Express)
3. **Cloud Services** (Firebase, Twilio, Gemini AI)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MOBILE CLIENT LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   UI Layer   │  │  Hooks Layer │  │ Service Layer│             │
│  │  (Screens)   │◄─┤ (useSOSEsc.) │◄─┤ (API Client) │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│         │                  │                  │                     │
│         └──────────────────┴──────────────────┘                     │
│                            │                                        │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             │ HTTPS/WSS
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                         BACKEND API LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Routes     │  │  Middleware  │  │   Helpers    │             │
│  │ (/trigger-sos│◄─┤ (Auth, Rate  │◄─┤ (Risk Calc,  │             │
│  │  /contacts)  │  │  Limit, Val.)│  │  SMS Sender) │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│         │                  │                  │                     │
│         └──────────────────┴──────────────────┘                     │
│                            │                                        │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             │ Admin SDK / REST API
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                      CLOUD SERVICES LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Firebase   │  │    Twilio    │  │  Gemini AI   │             │
│  │ (Auth, DB,   │  │  (SMS API)   │  │  (Chatbot)   │             │
│  │  Storage)    │  │              │  │              │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. SOS Escalation Flow

```
User Action (Shake/Sound/Voice/Button)
    │
    ▼
Frontend: useSOSEscalation Hook
    │
    ├─► Start 3-cycle warning (30 seconds total)
    │   └─► User can cancel ("I AM SAFE")
    │
    ▼
Frontend: sosEscalationService.escalate()
    │
    ├─► Get current location (GPS)
    ├─► Start audio recording
    │
    ▼
Backend: POST /trigger-sos
    │
    ├─► Validate auth token
    ├─► Calculate risk level (0-100 → LOW/MEDIUM/HIGH/VERY HIGH)
    ├─► Save to Firestore (users/{uid}/alerts, globalAlerts)
    │
    ▼
Backend: dispatchByRiskLevel()
    │
    ├─► Fetch emergency contacts from Firestore
    ├─► Filter by risk level:
    │   • MEDIUM (31-60): Family + Trusted
    │   • HIGH (61-85): + Volunteers + NGO
    │   • VERY HIGH (86-100): + Police + Emergency
    │
    ▼
Backend: sendSMS() via Twilio
    │
    └─► SMS sent to filtered contacts with:
        • Risk level emoji (🟢🟡🟠🔴)
        • Reason (e.g., "Shake Detected")
        • Google Maps location link
        • Timestamp
```

### 2. Risk Scoring Flow

```
Sensor Event (Shake/Sound/Voice)
    │
    ▼
Frontend: Sensor Service (shShakeDetectorAI.js, etc.)
    │
    ├─► Detect event locally
    ├─► Calculate risk delta:
    │   • Shake: +20 points
    │   • Sound: +25 points
    │   • Voice: +40 points
    │
    ▼
Backend: POST /update-risk
    │
    ├─► Validate input (value 0-100, reason, source)
    ├─► Get current session risk score (in-memory)
    ├─► Add delta: newScore = min(currentScore + delta, 100)
    ├─► Save to Firestore (users/{uid}/riskHistory)
    │
    ▼
Backend: Check threshold
    │
    ├─► If newScore > 30: Trigger emergency escalation
    │   └─► Call triggerEmergency()
    │
    ▼
Backend: Emit Socket.io event
    │
    └─► Push real-time update to:
        • User's device (room: user:{uid})
        • Admin dashboard (room: admin)
```

### 3. Authentication Flow

```
User Login (Email/Password)
    │
    ▼
Frontend: Firebase Auth SDK
    │
    ├─► signInWithEmailAndPassword()
    ├─► Receive ID token (JWT)
    │
    ▼
Backend: POST /login
    │
    ├─► Verify ID token using Firebase Admin SDK
    ├─► Extract uid from decoded token
    ├─► Update lastLoginAt in Firestore
    │
    ▼
Frontend: Store token in AsyncStorage
    │
    └─► Include in all API requests:
        Authorization: Bearer {token}
```

## Database Schema (Firestore)

```
users/{uid}
  ├─ name: string
  ├─ email: string
  ├─ phone: string
  ├─ createdAt: timestamp
  ├─ lastLoginAt: timestamp
  │
  ├─ contacts/{contactId}
  │   ├─ name: string
  │   ├─ phone: string (E.164 format)
  │   ├─ type: "family" | "trusted" | "volunteer" | "ngo" | "police" | "emergency"
  │   └─ createdAt: timestamp
  │
  ├─ alerts/{alertId}
  │   ├─ message: string
  │   ├─ riskScore: number (0-100)
  │   ├─ source: "shake" | "sound" | "voice" | "manual" | "system"
  │   ├─ seen: boolean
  │   └─ createdAt: timestamp
  │
  ├─ riskHistory/{historyId}
  │   ├─ score: number (0-100)
  │   ├─ delta: number (points added)
  │   ├─ reason: string
  │   ├─ source: string
  │   └─ createdAt: timestamp
  │
  ├─ sensorEvents/{eventId}
  │   ├─ type: "shake" | "sound" | "voice" | "recording_start" | "recording_stop"
  │   ├─ value: any (sensor reading)
  │   ├─ riskAdded: number
  │   └─ createdAt: timestamp
  │
  └─ recordings/{recordingId}
      ├─ filename: string
      ├─ fileUrl: string (Firebase Storage URL)
      ├─ type: "audio" | "video"
      ├─ reason: string
      ├─ size: number (bytes)
      └─ createdAt: timestamp

locations/{locationId}
  ├─ uid: string
  ├─ latitude: number
  ├─ longitude: number
  ├─ sessionId: string (optional)
  └─ timestamp: timestamp

globalAlerts/{alertId}
  ├─ uid: string
  ├─ reason: string
  ├─ riskScore: number
  ├─ riskLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH"
  ├─ latitude: number
  ├─ longitude: number
  └─ timestamp: timestamp
```

## Security Architecture

### 1. Authentication & Authorization

- **Client-side:** Firebase Auth SDK handles user authentication
- **Server-side:** Firebase Admin SDK verifies ID tokens on every request
- **Middleware:** `requireAuth()` validates token, `requireSelfOrAdmin()` checks ownership

### 2. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      
      // Sub-collections inherit parent rules
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
    
    // Locations: users can only write their own
    match /locations/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.uid;
    }
    
    // Global alerts: authenticated users can create, admins read (via Admin SDK)
    match /globalAlerts/{docId} {
      allow create: if request.auth != null;
    }
  }
}
```

### 3. Input Validation

All API endpoints use validation middleware:

- **UID validation:** Alphanumeric + dashes/underscores, 1-128 chars
- **Email validation:** Standard email regex
- **Phone validation:** E.164 format (+[country code][number])
- **Location validation:** Latitude (-90 to 90), Longitude (-180 to 180)
- **Risk score validation:** 0-100 range
- **String sanitization:** Remove control characters, enforce max length

### 4. Rate Limiting

- **General endpoints:** 100 requests per 15 minutes per IP
- **SOS endpoints:** 10 requests per 15 minutes per UID (prevents abuse)

### 5. Data Encryption

- **In transit:** HTTPS (TLS 1.3) for REST API, WSS for Socket.io
- **At rest:** Firebase Firestore encrypts all data by default
- **Secrets:** Environment variables (never committed to version control)

## Scalability Considerations

### Current Limitations

1. **In-memory sessions:** `activeSessions` object in server.js won't scale beyond single server
2. **No caching:** Every risk score fetch hits Firestore
3. **No load balancing:** Single backend instance

### Scaling Strategy (Future)

1. **Replace in-memory sessions with Redis:**
   ```javascript
   const redis = require('redis');
   const client = redis.createClient();
   
   // Store session
   await client.set(`session:${uid}`, JSON.stringify(sessionData));
   
   // Get session
   const data = await client.get(`session:${uid}`);
   ```

2. **Add caching layer:**
   - Cache user profiles (TTL: 5 minutes)
   - Cache risk scores (TTL: 30 seconds)
   - Cache emergency contacts (TTL: 10 minutes)

3. **Horizontal scaling:**
   - Deploy multiple backend instances behind load balancer
   - Use Redis for session sharing
   - Use Redis Pub/Sub for Socket.io multi-server support

4. **Database optimization:**
   - Add Firestore indexes for common queries
   - Use Firestore query cursors for pagination
   - Implement read replicas for analytics queries

## Monitoring & Observability

### Health Check Endpoints

- `GET /health` — Basic liveness check
- `GET /health/ready` — Readiness check (validates Firebase connectivity)
- `GET /health/live` — Process status and memory usage

### Logging

- **Structured logging:** JSON format with timestamp, tag, message, metadata
- **Daily rotation:** Logs saved to `/logs/YYYY-MM-DD.log`
- **Log levels:** INFO, WARN, ERROR

### Metrics (Future)

- Request rate (requests/second)
- Error rate (errors/total requests)
- Response time (p50, p95, p99)
- SOS trigger rate (triggers/hour)
- False positive rate (cancellations/triggers)

## Deployment

### Prerequisites

1. Firebase project with Auth, Firestore, Storage enabled
2. Twilio account with SMS API credentials
3. Google Gemini API key
4. Node.js 18+ runtime

### Environment Variables

**Backend (.env):**
```env
PORT=5000
FIRESTORE_PREFER_REST=true
GEMINI_API_KEY=your_key
TWILIO_SID=your_sid
TWILIO_TOKEN=your_token
TWILIO_PHONE=+1234567890
FIREBASE_STORAGE_BUCKET=project.appspot.com
ALLOWED_ORIGINS=https://app.safeher.com
```

**Frontend (.env.local):**
```env
EXPO_PUBLIC_API_URL=https://api.safeher.com
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project
```

### Deployment Steps

1. **Backend:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Frontend:**
   ```bash
   npm install
   npx expo start
   ```

3. **Production Build:**
   ```bash
   # Android
   eas build --platform android --profile production
   
   # iOS
   eas build --platform ios --profile production
   ```

## Testing Strategy

### Unit Tests

- Input validation functions
- Risk level calculation logic
- String sanitization

### Integration Tests

- All API endpoints (9 test cases)
- Authentication flow
- SOS escalation flow

### Manual Testing

- Sensor detection (shake, sound, voice)
- Real-time Socket.io updates
- SMS delivery (Twilio)
- AI chatbot responses (Gemini)

### Test Coverage Goals

- Unit tests: 70%+
- Integration tests: 100% of critical paths
- E2E tests: Core user journeys

## Future Enhancements

1. **ML-based threat prediction:** TensorFlow Lite for on-device anomaly detection
2. **Offline mode:** Local queue with background sync
3. **Push notifications:** FCM/APNs for background alerts
4. **Admin dashboard:** Real-time monitoring of all SOS events
5. **Analytics:** User behavior tracking, incident reports
6. **Multi-language:** i18n support for Hindi, Tamil, Telugu, Bengali
