# SafeHer - Architecture Diagrams

## Visual Reference Guide

This document provides ASCII diagrams for quick reference of SafeHer's architecture.

---

## Current System Architecture (2026)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile Application                        │
│                       (React Native + Expo)                      │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   SOS    │  │   Map    │  │ Contacts │  │ Evidence │       │
│  │  Screen  │  │  Screen  │  │  Screen  │  │  Vault   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Core Services Layer                        │    │
│  │  • API Client  • Auth  • Location  • Audio             │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS/WSS
┌─────────────────────────────────────────────────────────────────┐
│                        Backend Server                            │
│                     (Node.js + Express)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                API Gateway Layer                        │    │
│  │  • Authentication  • Rate Limiting  • CORS             │    │
│  └────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │               Controller Layer                          │    │
│  │  • SOS  • Location  • Recording  • Contacts            │    │
│  └────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                Service Layer                            │    │
│  │  • Core  • Blockchain  • AI  • Twilio                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                              ↓                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Data Access Layer                          │    │
│  │  • Firestore  • Firebase Storage  • Redis (future)     │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     External Services                            │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Firebase │  │ Polygon  │  │  Twilio  │  │  Google  │       │
│  │Firestore │  │Blockchain│  │   SMS    │  │   Maps   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Future Microservices Architecture (2027+)

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
│                  (Kong / AWS API Gateway)                        │
│                                                                  │
│  • Authentication  • Rate Limiting  • Load Balancing            │
│  • Request Routing  • API Versioning  • Monitoring              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
          ┌───────────────────┼───────────────────┐
          ↓                   ↓                   ↓
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ Auth Service │    │ User Service │    │ SOS Service  │
  │              │    │              │    │              │
  │ • JWT        │    │ • Profiles   │    │ • Alerts     │
  │ • OAuth      │    │ • Settings   │    │ • Recording  │
  │ • Sessions   │    │ • Contacts   │    │ • Dispatch   │
  └──────────────┘    └──────────────┘    └──────────────┘
          ↓                   ↓                   ↓
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │Location Svc  │    │ Device Svc   │    │  AI Service  │
  │              │    │              │    │              │
  │ • GPS        │    │ • IoT        │    │ • ML Models  │
  │ • Heatmap    │    │ • Wearables  │    │ • Prediction │
  │ • Routing    │    │ • Management │    │ • Analysis   │
  └──────────────┘    └──────────────┘    └──────────────┘
          ↓                   ↓                   ↓
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │Blockchain Svc│    │ Comms Service│    │Analytics Svc │
  │              │    │              │    │              │
  │ • Evidence   │    │ • SMS        │    │ • Metrics    │
  │ • Verify     │    │ • Push       │    │ • Reporting  │
  │ • Audit      │    │ • Email      │    │ • Insights   │
  └──────────────┘    └──────────────┘    └──────────────┘
                              ↓
          ┌───────────────────┼───────────────────┐
          ↓                   ↓                   ↓
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  PostgreSQL  │    │   Firestore  │    │    Redis     │
  │              │    │              │    │              │
  │ • Relational │    │ • Real-time  │    │ • Cache      │
  │ • Analytics  │    │ • Documents  │    │ • Sessions   │
  └──────────────┘    └──────────────┘    └──────────────┘
```

---

## IoT Device Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      IoT Devices Layer                           │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Panic   │  │  Smart   │  │   Door   │  │   GPS    │       │
│  │  Button  │  │  Watch   │  │  Sensor  │  │ Tracker  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
          ↓ BLE          ↓ WiFi        ↓ MQTT       ↓ LoRa
┌─────────────────────────────────────────────────────────────────┐
│                    Protocol Adapters                             │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   BLE    │  │   WiFi   │  │   MQTT   │  │  LoRaWAN │       │
│  │ Adapter  │  │ Adapter  │  │ Adapter  │  │ Adapter  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Hardware Abstraction Layer (HAL)                    │
│                                                                  │
│  • Device Discovery  • Connection Management                    │
│  • Event Routing     • Health Monitoring                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Device Registry                               │
│                                                                  │
│  • Device Catalog    • Status Tracking                          │
│  • User Association  • Firmware Management                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  SafeHer Core Platform                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Wearable Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Wearable Devices                              │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Apple   │  │  Wear    │  │ Samsung  │  │  Fitbit  │       │
│  │  Watch   │  │   OS     │  │  Watch   │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
          ↓              ↓              ↓              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Platform SDKs                                   │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ HealthKit│  │ Google   │  │ Samsung  │  │  Fitbit  │       │
│  │   (iOS)  │  │   Fit    │  │  Health  │  │   API    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Wearable Service                                │
│                                                                  │
│  • Connection Management    • Health Data Sync                  │
│  • Real-time Monitoring     • Anomaly Detection                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Health Monitoring Service                           │
│                                                                  │
│  • AI Analysis              • Panic Prediction                  │
│  • Fall Detection           • Alert Generation                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  SafeHer Core Platform                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Satellite Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile Device                                 │
│                                                                  │
│  • Cellular Network Unavailable                                 │
│  • Emergency SOS Triggered                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Network Detection Layer                             │
│                                                                  │
│  [Cellular] → [WiFi] → [Satellite] ← Automatic Fallback        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Satellite Service                                   │
│                                                                  │
│  • Message Compression      • Queue Management                  │
│  • Provider Selection       • Retry Logic                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
          ┌───────────────────┼───────────────────┐
          ↓                   ↓                   ↓
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │   Iridium    │    │  Globalstar  │    │   Starlink   │
  │   Network    │    │              │    │              │
  └──────────────┘    └──────────────┘    └──────────────┘
          ↓                   ↓                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Satellite Network                               │
│                                                                  │
│  • Global Coverage          • Low Latency                       │
│  • Emergency Priority       • Delivery Confirmation             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              SafeHer Backend (Ground Station)                    │
│                                                                  │
│  • Message Reception        • Emergency Dispatch                │
│  • Contact Notification     • Location Tracking                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## SOS Trigger Flow with Future Enhancements

```
┌─────────────────────────────────────────────────────────────────┐
│                    Trigger Sources                               │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Manual  │  │  Voice   │  │   IoT    │  │ Wearable │       │
│  │  Button  │  │ Command  │  │  Panic   │  │   Fall   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  SOS Processing Engine                           │
│                                                                  │
│  1. Capture Location (GPS/WiFi/Cell Tower)                      │
│  2. Start Audio/Video Recording                                 │
│  3. Generate Evidence Hash (SHA-256)                            │
│  4. Assess Risk Level (AI Analysis)                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
          ┌───────────────────┼───────────────────┐
          ↓                   ↓                   ↓
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │   Firestore  │    │   Twilio     │    │  Blockchain  │
  │              │    │              │    │              │
  │ Save SOS     │    │ Send SMS     │    │ Store Hash   │
  │ Record       │    │ Alerts       │    │ On-Chain     │
  └──────────────┘    └──────────────┘    └──────────────┘
          ↓                   ↓                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Real-time Notifications                         │
│                                                                  │
│  • Emergency Contacts (SMS, Push, Call)                         │
│  • Live Location Sharing (WebSocket)                            │
│  • Evidence Upload (Firebase Storage)                           │
│  • Blockchain Verification (Polygon)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Future Enhancements                                 │
│                                                                  │
│  • Video Streaming (WebRTC)                                     │
│  • Satellite Fallback (Iridium/Starlink)                        │
│  • AI False Positive Detection                                  │
│  • 911/112 Integration                                          │
│  • Drone Dispatch (Future)                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Multi-Region Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Global Load Balancer                            │
│                (GeoDNS / CloudFlare)                             │
│                                                                  │
│  • Geographic Routing    • Health Checks                        │
│  • DDoS Protection       • SSL/TLS Termination                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
          ┌───────────────────┼───────────────────┐
          ↓                   ↓                   ↓
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │   US-East    │    │   EU-West    │    │Asia-Pacific  │
  │              │    │              │    │              │
  │ • App Servers│    │ • App Servers│    │ • App Servers│
  │ • Database   │    │ • Database   │    │ • Database   │
  │ • Cache      │    │ • Cache      │    │ • Cache      │
  │ • Storage    │    │ • Storage    │    │ • Storage    │
  └──────────────┘    └──────────────┘    └──────────────┘
          ↓                   ↓                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Data Replication                                │
│                                                                  │
│  • Master-Replica (PostgreSQL)                                  │
│  • Multi-Region (Firestore)                                     │
│  • CDN Sync (Static Assets)                                     │
│  • Cache Invalidation (Redis)                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture (Defense in Depth)

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Network Security                                       │
│ • Firewall  • DDoS Protection  • Rate Limiting                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Transport Security                                     │
│ • TLS 1.3  • Certificate Pinning  • HSTS                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Authentication & Authorization                         │
│ • JWT Tokens  • OAuth 2.0  • RBAC  • MFA                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Application Security                                   │
│ • Input Validation  • SQL Injection Prevention                  │
│ • XSS Protection  • CSRF Tokens                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 5: Data Security                                          │
│ • Encryption at Rest  • Encryption in Transit                   │
│ • Data Masking  • Secure Key Management                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 6: Monitoring & Auditing                                  │
│ • Logging  • Intrusion Detection  • Audit Trails                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Evidence Upload with Blockchain

```
┌─────────────────────────────────────────────────────────────────┐
│                  Recording Complete                              │
│                                                                  │
│  • Audio/Video File                                             │
│  • Metadata (timestamp, location, duration)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Client-Side Processing                              │
│                                                                  │
│  1. Generate SHA-256 Hash                                       │
│  2. Prepare Multipart Upload                                    │
│  3. Encrypt File (Optional)                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│              Backend Server                                      │
│                                                                  │
│  1. Authenticate Request                                        │
│  2. Verify File Hash                                            │
│  3. Scan for Malware                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
          ┌───────────────────┼───────────────────┐
          ↓                   ↓                   ↓
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │   Firebase   │    │   Firestore  │    │   Polygon    │
  │   Storage    │    │              │    │  Blockchain  │
  │              │    │              │    │              │
  │ Upload File  │    │ Save         │    │ Store Hash   │
  │ Get URL      │    │ Metadata     │    │ On-Chain     │
  └──────────────┘    └──────────────┘    └──────────────┘
          ↓                   ↓                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Response to Client                              │
│                                                                  │
│  • Upload Success                                               │
│  • File URL                                                     │
│  • Blockchain Transaction Hash                                  │
│  • Verification Link                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Observability Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
│                                                                  │
│  • Request Logs    • Error Logs    • Audit Logs                │
│  • Metrics         • Traces        • Events                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
          ┌───────────────────┼───────────────────┐
          ↓                   ↓                   ↓
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  Prometheus  │    │ Elasticsearch│    │    Jaeger    │
  │              │    │              │    │              │
  │ • Metrics    │    │ • Logs       │    │ • Traces     │
  │ • Alerts     │    │ • Search     │    │ • Spans      │
  └──────────────┘    └──────────────┘    └──────────────┘
          ↓                   ↓                   ↓
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │   Grafana    │    │    Kibana    │    │   Jaeger UI  │
  │              │    │              │    │              │
  │ • Dashboards │    │ • Log        │    │ • Trace      │
  │ • Alerts     │    │   Explorer   │    │   Viewer     │
  └──────────────┘    └──────────────┘    └──────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Alert Manager                                   │
│                                                                  │
│  • PagerDuty    • Slack    • Email    • SMS                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Legend

```
┌──────────┐
│  Box     │  = Component / Service / Layer
└──────────┘

    ↓         = Data Flow / Communication

┌──────────────────────────────────────┐
│  Grouped Box                         │  = Logical Grouping
└──────────────────────────────────────┘

• Bullet    = Feature / Capability
```

---

**Note:** These diagrams are ASCII representations for documentation purposes. For production use, consider tools like:
- **Lucidchart** - Professional diagramming
- **Draw.io** - Free diagramming tool
- **PlantUML** - Code-based diagrams
- **Mermaid** - Markdown-based diagrams

---

**SafeHer - Visualizing Safety Architecture** 🏗️

