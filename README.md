# SafeHer 🛡️

A comprehensive, AI-powered women's safety mobile application built with React Native (Expo) and a Node.js/Firebase backend. 

SafeHer is designed to provide real-time protection, emergency escalation, and community support through intelligent sensor detection and dynamic risk scoring.

## 🚀 Features

*   **🧠 AI Risk Engine:** Continuously evaluates user safety using a multi-factor scoring system (0-100).
*   **🤖 AI Safety Chatbot:** Gemini-powered assistant providing immediate safety advice, self-defense tips, and emotional support.
*   **🚨 Smart Escalation System:** Automatically notifies Family (Medium Risk), Volunteers (High Risk), or Police (Critical Risk) based on real-time threat levels.
*   **🎙️ Voice Keyword Detection:** Detects distress keywords (e.g., "help me", "emergency") locally to auto-trigger SOS.
*   **📳 Shake & 🔊 Sound Detection:** Hardware sensor integration to detect physical struggles or loud screams.
*   **🎥 Auto-Evidence Recording:** Automatically starts logging evidence when high-risk thresholds are crossed.
*   **🗺️ Dynamic Safe Routes:** Provides real-time mapping of nearby danger zones and safe routes based on live GPS tracking.

## 🛠️ Technology Stack

*   **Frontend:** React Native (Expo), Expo Router, Socket.io-client
*   **Backend:** Node.js, Express, Socket.io (Real-time events)
*   **Database & Auth:** Firebase Auth, Firestore, Firebase Admin SDK
*   **AI Integration:** Google Gemini 2.0 Flash API

## 📋 Prerequisites

To run this project, you will need:
*   Node.js (v18+)
*   Expo CLI (`npm install -g expo-cli`)
*   Firebase Project with Firestore and Authentication (Email/Password) enabled
*   Google Gemini API Key
*   Twilio Account (Optional, for SMS alerts)

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/safeher.git
cd safeher
```

### 2. Backend Setup
```bash
cd backend
npm install
```
*   Create a `.env` file in the `backend/` directory:
    ```env
    PORT=5000
    FIRESTORE_PREFER_REST=true
    GEMINI_API_KEY=your_gemini_api_key
    ```
*   Download your Firebase Service Account Key and save it as `backend/serviceAccountKey.json`.
*   Start the server:
    ```bash
    npm start
    ```

### 3. Frontend Setup
Open a new terminal window.
```bash
# from the root 'safeher' directory
npm install
npx expo start
```
*   Scan the QR code with the Expo Go app on your phone.

## 🔒 Security & Privacy

*   Location data is only transmitted during active sessions or SOS triggers.
*   Voice detection runs strictly on-device using local keyword matching.
*   API Keys and Service Accounts are ignored in version control to prevent leaks.
