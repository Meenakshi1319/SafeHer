# SafeHer - Women's Safety Application

SafeHer is a comprehensive mobile safety application designed to enhance personal security through intelligent monitoring, emergency response, and community features.

## 🌟 Features

### Core Safety Features
- **Real-time Risk Assessment**: AI-powered risk scoring based on location, time, and environmental factors
- **Emergency SOS**: Quick access emergency alert system with escalation protocols
- **Live Location Tracking**: Share your location with trusted contacts
- **Smart Check-ins**: Automated safety check-ins with customizable intervals
- **Fake Call Feature**: Decoy call interface for uncomfortable situations
- **Audio/Video Recording**: Automatic recording during high-risk situations

### AI-Powered Features
- **Voice Trigger Detection**: Activate emergency features with voice commands
- **Shake Detection**: Motion-based emergency activation
- **Sound Analysis**: Detect distress sounds and potential threats
- **Intelligent Alerts**: Context-aware notifications to emergency contacts

### Community & Support
- **Emergency Contacts Management**: Organize and prioritize your safety network
- **Community Safety Map**: View and report safe/unsafe areas
- **Resource Directory**: Access to local emergency services and support organizations

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
   git clone <your-repo-url>
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
├── services/                # Frontend service layer
├── hooks/                   # Custom React hooks
├── constants/               # App constants and configuration
└── assets/                  # Images, sounds, and static files
```

## 🔒 Security & Privacy

- All sensitive data is encrypted in transit and at rest
- API keys and credentials are never committed to the repository
- User location data is only shared with explicitly authorized contacts
- Audio/video recordings are stored securely with user consent
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for security details

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run with coverage
npm run test:coverage
```

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed installation and configuration
- [API Documentation](./API_DOCUMENTATION.md) - Backend API reference
- [Architecture Overview](./ARCHITECTURE.md) - System design and architecture
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to the project

## 🛠️ Technology Stack

### Frontend
- React Native with Expo
- TypeScript
- Expo Router for navigation
- Firebase for authentication and storage
- Socket.io for real-time communication

### Backend
- Node.js with Express
- Firebase Admin SDK
- Google Gemini AI
- OpenAI API
- Twilio for SMS/calls
- Socket.io for WebSocket connections

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## ⚠️ Important Notes

- **Never commit sensitive files**: `.env`, `.env.local`, `serviceAccountKey.json`
- **API Keys**: Keep all API keys secure and rotate them if exposed
- **Testing**: Always test on physical devices for location and sensor features
- **Production**: Use environment-specific configurations for deployment

## 🆘 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review the troubleshooting section in [SETUP.md](./SETUP.md)

## 🙏 Acknowledgments

Built with the goal of making the world safer for everyone.

---

**Note**: This application is designed to enhance personal safety but should not replace professional emergency services. Always call local emergency services (911, 112, etc.) in life-threatening situations.
