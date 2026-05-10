# SafeHer - AI Integrated Women's Safety Application 🛡️

SafeHer is an advanced AI-powered women's safety mobile application designed to provide real-time protection and intelligent emergency response. By leveraging Artificial Intelligence, GPS tracking, and sensor-based detection, SafeHer ensures safety even when a user cannot manually trigger an SOS.

## 📖 Table of Contents
* [Problem Statement](#-problem-statement)
* [Proposed Solution](#-proposed-solution)
* [Key Features](#-key-features)
* [Quick Start](#-quick-start)
* [Project Structure](#-project-structure)
* [System Architecture](#-system-architecture)
* [Tech Stack](#-tech-stack)
* [Security & Privacy](#-security--privacy)
* [Testing](#-testing)
* [Documentation](#-documentation)
* [The Team](#-the-team)
* [Future Enhancements](#-future-enhancements)
* [Contributing](#-contributing)
* [License](#-license)

---

## ⚠️ Problem Statement
Most existing safety apps rely on **manual SOS activation**. In high-stress situations, victims may:
* Experience extreme panic
* Be unable to reach or unlock their phone
* Face internet dependency or weak evidence protection

## 💡 Proposed Solution
SafeHer provides an automated safety ecosystem that monitors:
* **Voice Stress:** Detects panic and specific keywords
* **Environmental Sound:** Identifies screams and abnormal distress sounds
* **Physical Motion:** Uses accelerometers for shake and fall detection
* **Smart Risk Scoring:** Generates a dynamic danger level to trigger emergency modes automatically

---

## ✨ Key Features

### 🧠 AI-Based Detection
* **Voice recognition:** Detects keywords like *"Help me"*, *"Save me"*, or *"Emergency"*
* **Sound Analysis:** Identifies loud screams and environmental distress
* **Shake Detection:** Uses Expo sensors to detect sudden movements or struggles

### 🚨 Core Safety Features
- **Real-time Risk Assessment**: AI-powered risk scoring based on location, time, and environmental factors
- **Emergency SOS**: Quick access emergency alert system with escalation protocols
- **Live Location Tracking**: Share your location with trusted contacts
- **Smart Check-ins**: Automated safety check-ins with customizable intervals
- **Fake Call Feature**: Decoy call interface for uncomfortable situations
- **Audio/Video Recording**: Automatic recording during high-risk situations

### 📍 Live Tracking & Community
* **Real-time GPS:** Integrated with Google Maps for precise tracking
* **Risk Zone Detection:** Alerts users when entering high-risk areas
* **Community Safety Map**: View and report safe/unsafe areas
* **Volunteer Support:** Notifies nearby community members for immediate help

### 🛡️ Evidence Protection
* **Silent Recording:** Automatically triggers audio/video recording during emergencies
* **Cloud Backup:** Securely stores evidence in Firebase/Cloud Storage to prevent tampering

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Expo CLI
- Firebase account
- API keys for: Twilio, Google Gemini, OpenAI

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Meenakshi1319/SafeHer.git
   cd SafeHer
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend
   npm install
   cd ..
   ```

3. **Configure environment variables**
   - Copy `.env.local.example` to `.env.local` and configure frontend
   - Copy `backend/.env.example` to `backend/.env` and add your API keys
   - Add Firebase service account key as `backend/serviceAccountKey.json`

4. **Start the application**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm start

   # Terminal 2 - Frontend
   npm start
   ```

For detailed setup instructions, see [SETUP.md](./SETUP.md)

## 📁 Project Structure

```
SafeHer/
├── app/                      # Frontend application screens
│   ├── (tabs)/              # Tab-based navigation screens
│   ├── login.tsx            # Authentication screens
│   └── register.tsx
├── backend/                  # Backend API server
│   ├── routes/              # API route handlers
│   ├── middleware/          # Express middleware
│   └── __tests__/           # Backend tests
├── components/              # Reusable React components
├── hooks/                   # Custom React hooks
├── constants/               # App constants and configuration
└── assets/                  # Images, sounds, and static files
```

## 🏗️ System Architecture

### Architecture Layers
1. **Frontend:** React Native handles the UI and real-time sensor monitoring
2. **Backend:** Node.js processes complex triggers and API requests
3. **Database:** Firebase manages authentication, real-time data, and push notifications
4. **AI Modules:** Dedicated logic for analyzing voice, sound, and motion patterns

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)

### Framework Architecture
SafeHer follows a **feature-based modular architecture** for scalability and maintainability:
- **Feature Modules**: Emergency, Tracking, AI, Contacts, Recording, Decoy, Check-in, Community
- **Shared Components**: Reusable UI components and utilities
- **Core Infrastructure**: API client, Firebase, WebSocket, Storage

See [FRAMEWORK_ARCHITECTURE.md](./FRAMEWORK_ARCHITECTURE.md) for complete details.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React Native + Expo** | Cross-platform Mobile Application |
| **TypeScript** | Type-safe development |
| **Firebase** | Authentication, Real-time Database & Cloud Messaging |
| **Node.js + Express** | Backend APIs & Business Logic |
| **Google Maps API** | Live Location Tracking |
| **Google Gemini AI** | AI-powered risk assessment |
| **OpenAI API** | Advanced AI features |
| **Speech Recognition** | AI Voice Detection |
| **Expo Sensors** | Accelerometer & Shake Detection |
| **Twilio** | SMS and call notifications |
| **Socket.io** | Real-time WebSocket communication |
| **Cloud Storage** | Secure Evidence Backup |

---

## 🔒 Security & Privacy

- All sensitive data is encrypted in transit and at rest
- API keys and credentials are never committed to the repository
- User location data is only shared with explicitly authorized contacts
- Audio/video recordings are stored securely with user consent
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for security details

---

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run with coverage
npm run test:coverage
```

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

---

## 📚 Documentation

### Getting Started
- [SETUP.md](./SETUP.md) - Detailed installation and configuration
- [GITHUB_READY_SUMMARY.md](./GITHUB_READY_SUMMARY.md) - GitHub upload guide

### Framework & Architecture
- [FRAMEWORK_SUMMARY.md](./FRAMEWORK_SUMMARY.md) - Framework overview
- [FRAMEWORK_QUICKSTART.md](./FRAMEWORK_QUICKSTART.md) - Quick start guide
- [FRAMEWORK_ARCHITECTURE.md](./FRAMEWORK_ARCHITECTURE.md) - Complete architecture
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Migration instructions
- [docs/FRAMEWORK_VISUAL_GUIDE.md](./docs/FRAMEWORK_VISUAL_GUIDE.md) - Visual diagrams

### Technical Documentation
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Backend API reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and architecture
- [TESTING.md](./TESTING.md) - Testing guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines

---

## � The Team
* **Jahnavi** – Project Manager & Testing - https://github.com/Jahnavi55561
* **Meenakshi** – UI/UX Developer - https://github.com/Meenakshi1319
* **Mithra** – Backend Developer - https://github.com/Mithra65
* **Karthik** – Integration Developer - https://github.com/karthikeyagod
* **Dheemanth** – AI Developer - https://github.com/DHEEMANTH241106

---

## 🚀 Future Enhancements
- [ ] **AI Emotion Detection:** Understanding fear levels through vocal tone
- [ ] **Wearable Integration:** Smartwatch support for heart rate monitoring
- [ ] **Blockchain Evidence:** Decentralized security for legal evidence
- [ ] **Predictive Heatmaps:** Showing danger zones based on historical data

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## ⚠️ Important Notes

- **Never commit sensitive files**: `.env`, `.env.local`, `serviceAccountKey.json`
- **API Keys**: Keep all API keys secure and rotate them if exposed
- **Testing**: Always test on physical devices for location and sensor features
- **Production**: Use environment-specific configurations for deployment

---

## 🆘 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review the troubleshooting section in [SETUP.md](./SETUP.md)

---

## � Conclusion

SafeHer is more than an alert app; it is a **predictive ecosystem**. By removing the requirement for manual intervention, we bridge the gap between a threat occurring and help arriving.

Built with the goal of making the world safer for everyone. 💜

---

**Note**: This application is designed to enhance personal safety but should not replace professional emergency services. Always call local emergency services (911, 112, etc.) in life-threatening situations.
