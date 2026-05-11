# 🚀 SafeHer - Complete Setup Guide

This guide will help you set up SafeHer for local development or deployment.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Expo CLI** (`npm install -g expo-cli`)
- **Git** for version control
- **Firebase Account** ([Create one](https://firebase.google.com/))
- **Google Cloud Account** (for Maps API)
- **Twilio Account** (for SMS features)

---

## 🔐 Step 1: Get Required API Keys

### 1.1 Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Authentication** (Email/Password)
4. Enable **Firestore Database**
5. Enable **Storage**

#### Get Firebase Web Config:
- Go to Project Settings → General
- Scroll to "Your apps" → Web app
- Copy the configuration values

#### Get Firebase Admin SDK:
- Go to Project Settings → Service Accounts
- Click "Generate new private key"
- Save as `backend/serviceAccountKey.json` (DO NOT COMMIT THIS)

### 1.2 Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable these APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Directions API
   - Geocoding API
3. Create API credentials
4. Copy your API key

### 1.3 Gemini AI API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key (starts with `AIza`)

### 1.4 Twilio SMS

1. Go to [Twilio Console](https://www.twilio.com/console)
2. Get your Account SID (starts with `AC`)
3. Get your Auth Token
4. Get a phone number (or use trial number)

### 1.5 OpenAI (Optional)

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

---

## 📦 Step 2: Clone and Install

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/SafeHer.git
cd SafeHer

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

---

## ⚙️ Step 3: Configure Environment Variables

### 3.1 Frontend Configuration

Create `.env.local` in the root directory:

```bash
# Copy the example file
cp .env.local.example .env.local
```

Edit `.env.local` and add your values:

```env
# Backend API URL
# For Android Emulator: http://10.0.2.2:5000
# For iOS Simulator: http://localhost:5000
# For Physical Device: http://YOUR_LOCAL_IP:5000
EXPO_PUBLIC_API_URL=http://localhost:5000

# Google Maps API Key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Firebase Configuration (from Firebase Console)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3.2 Backend Configuration

Create `backend/.env`:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your values:

```env
# Server Configuration
PORT=5000
BACKEND_URL=http://localhost:5000
FIRESTORE_PREFER_REST=true

# Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Twilio Credentials
TWILIO_SID=your_twilio_account_sid
TWILIO_TOKEN=your_twilio_auth_token
TWILIO_PHONE=your_twilio_phone_number

# Firebase Storage
FIREBASE_STORAGE_BUCKET=your-project.appspot.com

# OpenAI API Key (Optional)
OPENAI_API_KEY=your_openai_api_key_here

# Google Maps API Key (Optional - for backend features)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3.3 Firebase Service Account

Place your Firebase Admin SDK key:

```bash
# Copy the downloaded JSON file
cp ~/Downloads/your-firebase-adminsdk.json backend/serviceAccountKey.json
```

**⚠️ IMPORTANT:** Never commit this file to git!

---

## 🔍 Step 4: Verify Configuration

The backend will automatically validate your environment variables on startup.

```bash
cd backend
npm start
```

You should see:

```
🔍 Validating Environment Configuration...

✅ Configured Variables:
   PORT: 5000
   GEMINI_API_KEY: AIzaSy...
   TWILIO_SID: ACad3e...
   ...

✅ Environment validation passed!

📦 Feature Availability:
   SMS Alerts (Twilio): ✅ Enabled
   AI Analysis (Gemini): ✅ Enabled
   Google Maps: ✅ Enabled
   Blockchain Evidence: ⚪ Disabled
```

If you see errors, fix the missing or invalid environment variables.

---

## 🚀 Step 5: Run the Application

### Start Backend Server

```bash
cd backend
npm start
```

Backend will run on `http://localhost:5000`

### Start Frontend App

In a new terminal:

```bash
# From project root
npm start
```

Then choose your platform:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go for physical device

---

## 📱 Step 6: Test the Application

### Test Backend Health

```bash
curl http://localhost:5000/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2026-05-11T..."
}
```

### Test Twilio SMS

```bash
cd backend
node send-test-sms.js +1234567890
```

### Test Firebase Connection

```bash
cd backend
node test_firestore.js
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep `.env` and `.env.local` files private
- Use `.gitignore` to exclude sensitive files
- Rotate API keys regularly
- Use environment-specific configurations
- Enable Firebase App Check in production
- Restrict API keys by HTTP referrer/IP

### ❌ DON'T:
- Commit `.env` files to git
- Share API keys in screenshots or documentation
- Use production keys in development
- Expose backend URLs publicly without authentication
- Store secrets in source code

---

## 🐛 Troubleshooting

### Backend won't start

**Error:** `Environment validation failed`

**Solution:** Check that all required environment variables are set in `backend/.env`

---

### Frontend can't connect to backend

**Error:** `Network request failed`

**Solution:** 
- Check `EXPO_PUBLIC_API_URL` in `.env.local`
- For Android emulator, use `http://10.0.2.2:5000`
- For physical device, use your computer's local IP
- Ensure backend is running

---

### Firebase authentication fails

**Error:** `Firebase: Error (auth/invalid-api-key)`

**Solution:**
- Verify Firebase config in `.env.local`
- Check that Firebase Authentication is enabled
- Ensure API key is correct

---

### Twilio SMS not working

**Error:** `Twilio authentication failed`

**Solution:**
- Verify `TWILIO_SID` starts with `AC`
- Verify `TWILIO_TOKEN` is 32 characters
- Verify `TWILIO_PHONE` is in E.164 format (+1234567890)
- Check Twilio account status

---

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Twilio Documentation](https://www.twilio.com/docs)
- [Google Maps API Documentation](https://developers.google.com/maps/documentation)

---

## 🆘 Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review backend logs in `backend/logs/`
3. Open an issue on GitHub
4. Contact the development team

---

## ✅ Setup Complete!

You're now ready to develop and test SafeHer locally. 

**Next Steps:**
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase
- Review [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API details
- Check [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines

---

**Happy Coding! 💜**
