# 🛡️ SafeHer

<div align="center">

# AI-Powered Women's Safety & Emergency Response Platform

![React Native](https://img.shields.io/badge/React%20Native-0.79-blue?logo=react)
![Expo](https://img.shields.io/badge/Expo-SDK%2054-black?logo=expo)
![Firebase](https://img.shields.io/badge/Firebase-Backend-orange?logo=firebase)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-Enabled-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-purple.svg)

> “Safety should travel with you like a shadow, not arrive after the storm.”

</div>

---

# 📑 Table of Contents

- [📌 Introduction](#-introduction)
- [🚨 Problem Statement](#-problem-statement)
- [✨ Features](#-features)
- [🧠 AI & Detection System](#-ai--detection-system)
- [🏗️ Technical Architecture](#️-technical-architecture)
- [📂 Project Structure](#-project-structure)
- [⚙️ Installation & Setup](#️-installation--setup)
- [🔥 Firebase Setup](#-firebase-setup)
- [📡 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [🔒 Security & Privacy](#-security--privacy)
- [🚀 Deployment Guide](#-deployment-guide)
- [⚠️ Known Limitations](#️-known-limitations)
- [🛣️ Future Roadmap](#️-future-roadmap)
- [🤝 Contributing](#-contributing)
- [👨‍💻 Team & Credits](#-team--credits)
- [📜 License](#-license)
- [📞 Support](#-support)

---

# 📌 Introduction

SafeHer is an AI-assisted women’s safety mobile application designed to provide rapid emergency response, intelligent threat detection, and real-time safety monitoring.

Built using **React Native**, **Expo**, **Firebase**, and a **Node.js backend**, SafeHer combines modern mobile technologies with emergency automation systems to create a fast, reliable, and accessible personal safety platform.

Unlike traditional safety apps that rely only on manual SOS buttons, SafeHer introduces:

- 🎤 Voice-triggered emergency activation
- 📳 Shake detection using device sensors
- 📍 Real-time live location sharing
- 🎥 Emergency evidence recording
- 🧠 AI-assisted risk escalation workflows
- ☎️ Decoy and fake-call safety features

The application is designed for:

- Women traveling alone
- Students
- Working professionals
- Night-shift employees
- Emergency situations where manual phone usage becomes difficult

---

# 🚨 Problem Statement

Women across the world continue to face safety threats in public spaces, workplaces, transportation systems, and isolated environments.

Current emergency applications often fail because they:

- Require manual interaction during panic situations
- Do not support intelligent emergency detection
- Lack real-time escalation workflows
- Fail in rapid evidence collection
- Provide limited communication systems

SafeHer addresses these gaps through a hybrid emergency ecosystem that combines:

- Sensor-based emergency detection
- AI-assisted workflows
- Real-time communication
- Trusted contact systems
- Live tracking and evidence storage

The goal is simple:

> Reduce emergency response time and improve personal safety accessibility through intelligent mobile technology.

---

# ✨ Features

## 🚨 Core Emergency Features

### SOS Activation System

SafeHer supports multiple emergency activation methods:

- 🔴 Manual SOS Button
- 📳 Shake Detection
- 🎤 Voice Trigger Detection
- ⏱️ Emergency Countdown System
- 🚨 Multi-level Emergency Escalation

---

### 📍 Live Location Sharing

- Real-time GPS tracking
- Google Maps integration
- Continuous location broadcasting
- Trusted contact visibility
- Route monitoring support

---

### 🎥 Emergency Recording

During emergencies, SafeHer can:

- Record audio evidence
- Capture video footage
- Upload files securely to Firebase Storage
- Store timestamps and metadata

---

### 👥 Trusted Contacts Management

Users can:

- Add emergency contacts
- Remove trusted contacts
- Share emergency alerts automatically
- Send live location during emergencies

---

### ☎️ Decoy Features

SafeHer includes decoy functionality for unsafe situations:

- Fake incoming call screen
- Silent emergency preparation
- Hidden alert workflows

---

### 🚨 Emergency Escalation Workflow

| Level | Action |
|---|---|
| Level 1 | Notify trusted contacts |
| Level 2 | Begin live tracking |
| Level 3 | Start evidence recording |
| Level 4 | Escalate emergency alerts |

---

# 🧠 AI & Detection System

## 🎤 Voice Trigger Detection

The app listens for emergency keywords such as:

- “Help”
- “Save me”
- “Emergency”

Voice detection is powered through speech recognition APIs.

---

## 📳 Shake Detection

Using accelerometer and motion sensors:

- Sudden aggressive movement patterns trigger alerts
- Emergency workflow can activate automatically

---

## ⚠️ Risk Assessment Engine

The app evaluates:

- User inactivity
- Sensor behavior
- Emergency frequency
- Trigger combinations

to determine escalation priority.

---

# 🏗️ Technical Architecture

## 📱 Frontend Architecture

| Technology | Usage |
|---|---|
| React Native | Cross-platform mobile app |
| Expo SDK 54 | Development platform |
| TypeScript | Type safety |
| Expo Router | File-based routing |
| Firebase SDK | Authentication & database |
| React Hooks | State management |

### Key Libraries

```bash
expo-location
expo-camera
expo-av
expo-sensors
expo-speech-recognition
react-native-maps
socket.io-client
firebase
```

---

## 🌐 Backend Architecture

| Technology | Usage |
|---|---|
| Node.js | Runtime environment |
| Express.js | REST API backend |
| Firebase Firestore | Database |
| Firebase Storage | Media storage |
| Socket.io | Real-time communication |
| Twilio | SMS & calling |
| Gemini API | AI integration |
| OpenAI API | Experimental AI workflows |

---

## 🔄 Real-Time Communication Flow

```text
Mobile App
    ↓
Socket.io Client
    ↓
Express + Socket.io Server
    ↓
Firebase Firestore
    ↓
Trusted Contacts & Emergency Systems
```

---

# 📂 Project Structure

```bash
SafeHer/
├── app/
├── src/
│   ├── core/
│   ├── features/
│   ├── shared/
│   └── config/
│
├── backend/
│   ├── src/
│   ├── routes/
│   ├── middleware/
│   ├── uploads/
│   └── server.js
│
├── assets/
├── docs/
├── scripts/
└── android/
```

---

# ⚙️ Installation & Setup

## 📋 Prerequisites

Before starting, ensure you have:

- Node.js v16+
- npm or yarn
- Expo CLI
- Firebase Project
- Google Maps API Key
- Twilio Account
- Android Studio or Xcode

---

## 1️⃣ Clone Repository

```bash
git clone https://github.com/Meenakshi1319/SafeHer.git
cd SafeHer
```

---

## 2️⃣ Install Frontend Dependencies

```bash
npm install
```

---

## 3️⃣ Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

---

## 4️⃣ Configure Environment Variables

### Frontend `.env.local`

```env
EXPO_PUBLIC_API_URL=http://localhost:5000

EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

### Backend `backend/.env`

```env
PORT=5000
NODE_ENV=development

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key"

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
```

---

# 🔥 Firebase Setup

## Create Firebase Project

1. Visit Firebase Console
2. Create a new project
3. Enable:
   - Authentication
   - Firestore
   - Cloud Storage

---

## Configure Authentication

Enable:

- Email/Password Login
- Google Login

---

## Download Service Account Key

Save the file as:

```bash
backend/serviceAccountKey.json
```

---

## Configure Firestore Rules

```bash
firestore.rules
```

---

# ▶️ Running the Application

## Start Backend

```bash
cd backend
npm start
```

Server runs on:

```bash
http://localhost:5000
```

---

## Start Frontend

```bash
npm start
```

---

## Run on Device

| Key | Action |
|---|---|
| `a` | Android Emulator |
| `i` | iOS Simulator |
| QR Code | Expo Go Device |

---

# 📡 API Documentation

## 🔐 Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/profile` | Get user profile |

---

## 🚨 Emergency Endpoints

| Method | Endpoint |
|---|---|
| POST | `/api/emergency/trigger` |
| POST | `/api/emergency/cancel` |
| GET | `/api/emergency/status` |
| POST | `/api/emergency/escalate` |

---

## 📍 Location Endpoints

| Method | Endpoint |
|---|---|
| POST | `/api/location/update` |
| GET | `/api/location/share` |
| POST | `/api/location/track` |

---

## 👥 Contacts Endpoints

| Method | Endpoint |
|---|---|
| GET | `/api/contacts` |
| POST | `/api/contacts` |
| DELETE | `/api/contacts/:id` |

---

## 🎥 Evidence Endpoints

| Method | Endpoint |
|---|---|
| POST | `/api/evidence/upload` |
| GET | `/api/evidence/:id` |
| DELETE | `/api/evidence/:id` |

---

# 🧪 Testing

## Backend Testing

```bash
cd backend
npm test
```

### Coverage

```bash
npm run test:coverage
```

### Includes

- Unit Tests
- Integration Tests
- Middleware Validation
- AI Service Testing
- API Testing

---

## Frontend Testing

```bash
npm test
```

### Tools Used

- Jest
- React Testing Library
- Supertest

---

# 🔒 Security & Privacy

## Security Features

- 🔐 Firebase Authentication
- 🔒 HTTPS/TLS Encryption
- 🧼 Input Sanitization
- 🚦 Rate Limiting
- 🛡️ Helmet.js Security Headers
- 🌐 Secure CORS Configuration
- 📁 Protected File Uploads

---

## Privacy Protection

SafeHer prioritizes user privacy:

- Location shared only with trusted contacts
- User-controlled permissions
- Secure Firebase Storage
- No unauthorized third-party sharing
- User-controlled data deletion

---

# 🚀 Deployment Guide

## 📱 Mobile Deployment

### Install EAS CLI

```bash
npm install -g eas-cli
```

---

### Login

```bash
eas login
```

---

### Configure EAS

```bash
eas build:configure
```

---

### Android Build

```bash
eas build --platform android
```

---

### iOS Build

```bash
eas build --platform ios
```

---

## 🌐 Backend Deployment

Recommended platforms:

- AWS
- Railway
- Render
- Google Cloud
- Heroku

### Production Checklist

- Configure environment variables
- Enable SSL/TLS
- Configure production CORS
- Set Firebase Admin credentials
- Enable monitoring & logging

---

# ⚠️ Known Limitations

## Experimental Features

The following features are currently experimental or partially implemented:

- Blockchain evidence verification
- Offline SOS systems
- Mesh networking
- Wearable integrations
- Predictive crime heatmaps
- Advanced emotion analysis

---

## Current Constraints

- Twilio trial limitations
- Firebase free-tier limits
- Google Maps API quotas
- Battery impact during continuous tracking

---

# 🛣️ Future Roadmap

## 📌 Short-Term Goals

- Better AI threat detection
- Offline optimization
- Multi-language support
- Accessibility improvements
- Battery optimization

---

## 🌌 Long-Term Vision

- Smartwatch integration
- Community safety network
- Blockchain verification
- Mesh communication systems
- Emergency service integration
- Advanced distress detection AI

---

# 🤝 Contributing

We welcome contributions from developers, designers, testers, and security researchers.

## Contribution Steps

```bash
1. Fork repository
2. Create feature branch
3. Commit changes
4. Push branch
5. Open Pull Request
```

---

## Code Standards

- Follow TypeScript best practices
- Write clean commits
- Add tests for new features
- Maintain documentation
- Follow existing project architecture

---

# 👨‍💻 Team & Credits

| Member | Role | GitHub |
|---|---|---|
| Jahnavi | Project Manager & Testing | https://github.com/Jahnavi55561 |
| Meenakshi | UI/UX Developer | https://github.com/Meenakshi1319 |
| Mithra | Backend Developer | https://github.com/Mithra65 |
| Karthik | Integration Developer | https://github.com/karthikeyagod |
| Dheemanth | AI Developer | https://github.com/DHEEMANTH241106 |

---

# 📜 License

This project is licensed under the MIT License.

See the `LICENSE` file for details.

---

# 📞 Support

## 🐞 Bug Reports

Please open issues in the GitHub repository.

---

## 💬 Discussions

Use GitHub Discussions for:

- Questions
- Feature requests
- Improvements
- Community support

---

## 🔐 Security Issues

For responsible disclosure of security vulnerabilities:

```text
security@safeher.app
```

---

# ⭐ Final Note

SafeHer is more than an application.  
It is an attempt to transform smartphones into intelligent emergency companions capable of reacting faster than panic itself.

Technology alone cannot solve safety challenges.  
But technology, designed responsibly, can become a powerful ally.

---

# 📚 Additional Documentation

- `ARCHITECTURE.md`
- `API_DOCUMENTATION.md`
- `SETUP_GUIDE.md`
- `SECURITY_AUDIT_REPORT.md`
- `CONTRIBUTING.md`
- `TESTING.md`
- `DEPLOYMENT_SECURITY_CHECKLIST.md`

---

<div align="center">

## 💙 Built with purpose, code, caffeine, and controlled chaos.

</div>
