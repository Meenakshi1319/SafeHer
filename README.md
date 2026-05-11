# SafeHer - AI Assisted Women's Safety Application 🛡️

SafeHer is a React Native based women’s safety application focused on fast emergency response, intelligent alert triggering, and real time location sharing. The project combines sensor based detection, Firebase services, and emergency escalation workflows to improve personal safety during high risk situations.


---

# 📖 Table of Contents

* [Problem Statement](#-problem-statement)
* [Current Solution](#-current-solution)
* [Implemented Features](#-implemented-features)
* [Tech Stack](#-tech-stack)
* [Project Structure](#-project-structure)
* [Architecture Overview](#-architecture-overview)
* [Setup Instructions](#-setup-instructions)
* [Environment Configuration](#-environment-configuration)
* [Testing](#-testing)
* [Security Notes](#-security-notes)
* [Limitations](#-limitations)
* [Future Scope](#-future-scope)
* [Team](#-team)
* [Contributing](#-contributing)
* [License](#-license)

---

# ⚠️ Problem Statement

Many safety applications depend completely on manual SOS activation. During emergencies, users may:

* Be unable to unlock their phone
* Experience panic or physical struggle
* Fail to contact emergency services quickly
* Need faster access to trusted contacts and location sharing

SafeHer aims to reduce response delay through assisted emergency detection and simplified emergency workflows.

---

# 💡 Current Solution

SafeHer provides:

* Manual SOS activation
* Sensor assisted shake detection
* Voice trigger based emergency activation
* Real time location sharing
* Firebase backed authentication and cloud integration
* Emergency escalation workflows
* Decoy/fake call functionality
* Audio recording during emergencies

The application currently focuses on practical emergency assistance features that are already implemented in the codebase.

---

# ✨ Implemented Features

## 🚨 Emergency Features

### SOS Activation

* Manual emergency trigger
* Shake detection based SOS activation
* Voice trigger support for emergency activation
* Escalation flow support through hooks and backend services

### Live Location Sharing

* GPS based location tracking
* Google Maps integration
* Trusted contact location sharing

### Emergency Recording

* Audio recording support during emergency situations
* Cloud storage integration for uploaded evidence files

### Decoy Features

* Fake call interface for unsafe social situations
* Quick access emergency screen

---

## 🧠 AI & Detection Features

### Voice Trigger Detection

The project includes voice trigger detection modules for emergency keyword activation.

### Shake Detection

Expo sensor APIs are used for motion and shake based emergency detection.

### Risk Monitoring

Basic risk assessment workflows exist within the frontend and backend integration.

> Note: Advanced AI classification, emotion detection, and predictive threat analysis are experimental/planned features and are not fully implemented.

---

# 🛠️ Tech Stack

| Technology           | Purpose                           |
| -------------------- | --------------------------------- |
| React Native + Expo  | Cross platform mobile app         |
| TypeScript           | Frontend development              |
| Firebase             | Authentication and cloud services |
| Node.js + Express    | Backend APIs                      |
| Google Maps API      | Live location tracking            |
| Socket.io            | Real time communication           |
| Expo Sensors         | Shake and motion detection        |
| Twilio               | SMS/call integration              |
| OpenAI / Gemini APIs | Experimental AI integrations      |

---

# 📁 Project Structure

```text
SafeHer/
├── app/
│   ├── (tabs)/
│   ├── login.tsx
│   └── register.tsx
│
├── backend/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── __tests__/
│   └── package.json
│
├── components/
├── hooks/
├── constants/
├── services/
├── assets/
└── docs/
```

---

# 🏗️ Architecture Overview

## Frontend

The frontend is built with React Native and Expo. It handles:

* UI rendering
* Sensor monitoring
* User authentication
* Emergency workflows
* Location handling

## Backend

The backend uses Node.js and Express for:

* API handling
* Emergency processing
* Notification workflows
* Firebase communication

## Firebase Services

Firebase is used for:

* Authentication
* Cloud data storage
* Real time updates
* Media uploads

---

# 🚀 Setup Instructions

## Prerequisites

Install the following before starting:

* Node.js v16+
* npm or yarn
* Expo CLI
* Firebase project

---

## 1. Clone Repository

```bash
git clone https://github.com/Meenakshi1319/SafeHer.git
cd SafeHer
```

---

## 2. Install Dependencies

### Frontend

```bash
npm install
```

### Backend

```bash
cd backend
npm install
cd ..
```

---

## 3. Configure Environment Variables

### Frontend

Create:

```text
.env.local
```

Add required frontend environment variables.

### Backend

Create:

```text
backend/.env
```

Add:

* Firebase configuration
* Twilio credentials
* API keys

---

## 4. Run Backend

```bash
cd backend
npm start
```

---

## 5. Run Frontend

```bash
npm start
```

Then launch using:

* Android Emulator
* iOS Simulator
* Expo Go

---

# 🔐 Environment Configuration

Never commit:

```text
.env
.env.local
serviceAccountKey.json
```

Use Git ignore rules to protect sensitive credentials.

---

# 🧪 Testing

## Backend Tests

```bash
cd backend
npm test
```

## Coverage

```bash
npm run test:coverage
```

The backend includes automated test files under:

```text
backend/__tests__/
```

---

# 🔒 Security Notes

* Firebase authentication is used for user access control
* Sensitive keys are stored through environment variables
* User location sharing is controlled through trusted contact flows
* Emergency recordings are intended for evidence support

> Blockchain verification and decentralized evidence storage are NOT currently implemented.

---

# ⚠️ Limitations

The following features are currently planned or partially implemented:

* Offline SOS fallback systems
* Mesh networking support
* Blockchain evidence verification
* Predictive crime heatmaps
* Wearable device integration
* Advanced AI emotion analysis

These should not be presented as fully working production features at the current stage.

---

# 🚀 Future Scope

## Planned Improvements

* AI based emotional distress analysis
* Smartwatch and wearable integration
* Offline emergency communication support
* Advanced threat scoring
* Community safety analytics
* Improved emergency escalation automation

---

# 👨‍💻 Team

| Member    | Role                      | GitHub Profile Link                  |
| --------- | ------------------------- | ------------------------------------ |
| Jahnavi   | Project Manager & Testing | https://github.com/Jahnavi55561      |
| Meenakshi | UI/UX Developer           | https://github.com/Meenakshi1319     |
| Mithra    | Backend Developer         | https://github.com/Mithra65          |
| Karthik   | Integration Developer     | https://github.com/karthikeyagod     |
| Dheemanth | AI Developer              | https://github.com/DHEEMANTH241106   |

---

# 🤝 Contributing

Contributions are welcome.

Steps:

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Open a pull request

---

# 📄 License

This project is licensed under the MIT License.

---

# 🆘 Support

For issues or feature requests:

* Open a GitHub issue
* Review setup documentation
* Check backend logs for debugging

---

# 💜 Conclusion

SafeHer focuses on building a practical and extensible emergency safety platform using React Native, Firebase, and intelligent emergency workflows.

The current implementation provides a strong foundation for future expansion while maintaining transparency about implemented
