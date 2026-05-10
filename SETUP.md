# SafeHer Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Firebase account
- Twilio account
- Google Gemini API key
- OpenAI API key

## Installation Steps

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd SafeHer
```

### 2. Install Dependencies

#### Frontend Dependencies
```bash
npm install
```

#### Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 3. Configure Environment Variables

#### Frontend Configuration
1. Copy `.env.local.example` to `.env.local`
   ```bash
   copy .env.local.example .env.local
   ```
2. Update `EXPO_PUBLIC_API_URL` with your backend URL:
   - For Android emulator: `http://10.0.2.2:5000`
   - For iOS simulator: `http://localhost:5000`
   - For physical device: `http://<your-local-ip>:5000`

#### Backend Configuration
1. Copy `backend/.env.example` to `backend/.env`
   ```bash
   copy backend\.env.example backend\.env
   ```
2. Fill in all the required API keys and credentials:
   - **GEMINI_API_KEY**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - **TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE**: Get from [Twilio Console](https://www.twilio.com/console)
   - **FIREBASE_STORAGE_BUCKET**: Your Firebase project storage bucket name
   - **OPENAI_API_KEY**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)

### 4. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the downloaded JSON file as `backend/serviceAccountKey.json`

### 5. Run the Application

#### Start Backend Server
```bash
cd backend
npm start
```
The backend will run on `http://localhost:5000`

#### Start Frontend (in a new terminal)
```bash
npm start
```

Then choose your platform:
- Press `a` for Android
- Press `i` for iOS
- Press `w` for web

## Project Structure

```
SafeHer/
├── app/                    # Frontend screens and navigation
├── backend/               # Backend API server
│   ├── middleware/       # Express middleware
│   ├── logs/            # Server logs (gitignored)
│   └── uploads/         # File uploads (gitignored)
├── assets/               # Images and static files
└── components/           # Reusable React components
```

## Important Notes

- Never commit `.env`, `.env.local`, or `serviceAccountKey.json` files
- Keep your API keys secure and rotate them if exposed
- Update the `EXPO_PUBLIC_API_URL` based on your development environment
- For production deployment, use environment-specific configuration

## Troubleshooting

### Backend won't start
- Ensure all environment variables are set in `backend/.env`
- Check that `serviceAccountKey.json` exists and is valid
- Verify Node.js version is compatible

### Frontend can't connect to backend
- Check that backend is running
- Verify `EXPO_PUBLIC_API_URL` matches your backend URL
- For physical devices, ensure both are on the same network

## Additional Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Architecture Overview](./ARCHITECTURE.md)

## Support

For issues and questions, please open an issue on GitHub.
