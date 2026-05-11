# EAS Build Guide - Voice Recognition Enabled

## 🎉 Build Started!

Your app is now building in the cloud with **full voice recognition** support!

---

## 📊 Build Status

**Platform:** Android  
**Profile:** Development  
**Status:** Building... ⏳

**What's being built:**
- ✅ Native modules (expo-speech-recognition)
- ✅ Voice recognition with word detection
- ✅ Loud sound detection
- ✅ AI-powered distress analysis
- ✅ All existing features

---

## ⏱️ Build Time

**Expected:** 10-20 minutes

**What's happening:**
1. ⏳ Uploading project to EAS servers
2. ⏳ Installing dependencies
3. ⏳ Compiling native modules
4. ⏳ Building Android APK
5. ⏳ Uploading build artifact

**You can:**
- ☕ Take a coffee break
- 📱 Check your phone
- 💻 Continue working on other things

---

## 📥 After Build Completes

### Step 1: Download the APK

You'll get a link like:
```
https://expo.dev/accounts/cartik98/projects/safeher-native/builds/...
```

**Options:**
- **A.** Open link on your phone → Download directly
- **B.** Open link on computer → Download → Transfer to phone
- **C.** Scan QR code with phone camera

### Step 2: Install the APK

**On your Android device:**

1. **Download the APK** from the link
2. **Open the APK file**
3. **Allow "Install from unknown sources"** if prompted
   - Settings → Security → Unknown sources → Enable
4. **Tap "Install"**
5. **Wait for installation**
6. **Tap "Open"**

### Step 3: Run the Development Server

**On your computer:**

```bash
cd "c:\Users\Karth\OneDrive\Desktop\SafeHer - github"
npx expo start --dev-client
```

**You'll see:**
```
› Metro waiting on exp://192.168.1.7:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

› Press a │ open Android
› Press w │ open web

› Press j │ open debugger
› Press r │ reload app
› Press m │ toggle menu
› Press o │ open project code in your editor

› Press ? │ show all commands
```

### Step 4: Connect Your Device

**Option A: Automatic (if on same WiFi)**
- App should connect automatically
- Look for "Connected to Metro" message

**Option B: Manual (scan QR code)**
- Open the installed app
- Tap "Scan QR Code"
- Scan the QR code from terminal

**Option C: Manual (enter URL)**
- Open the installed app
- Tap "Enter URL manually"
- Enter: `exp://192.168.1.7:8081`

---

## 🎤 Testing Voice Recognition

Once the app is running:

### Test 1: Voice Trigger Words

1. **Open the app**
2. **Check logs** for:
   ```
   ✅ Speech Recognition module loaded successfully
   ✅ Voice and sound safety monitor active
   ```
3. **Say loudly:** "Help me"
4. **Should trigger:** SOS alert
5. **Try other words:**
   - "Emergency"
   - "Save me"
   - "Bachao"
   - "Stop"
   - "Please help"

### Test 2: Loud Sound Detection

1. **Shout loudly** (without words)
2. **Should detect:** High volume
3. **Should report:** To backend
4. **Check logs** for:
   ```
   Loud sound reported to backend
   ```

### Test 3: AI Distress Detection

1. **Say:** "Someone is following me, I'm scared"
2. **AI analyzes** the transcript
3. **If distress detected:** Triggers SOS
4. **Check logs** for:
   ```
   🧠 Gemini AI Analysis Result: TRUE
   🚨 VOICE EMERGENCY DETECTED
   ```

---

## 🔍 Troubleshooting

### Build Failed

**Check:**
- Internet connection
- Expo account status
- Build logs for errors

**Try:**
```bash
eas build --profile development --platform android --clear-cache
```

### Can't Download APK

**Try:**
- Open link in different browser
- Use phone's browser directly
- Check download folder

### Can't Install APK

**Enable unknown sources:**
1. Settings → Security
2. Enable "Unknown sources"
3. Or: Settings → Apps → Special access → Install unknown apps
4. Enable for your browser

### App Won't Connect

**Check:**
1. Phone and computer on same WiFi
2. Metro server is running
3. Firewall not blocking port 8081

**Try:**
```bash
# Stop server (Ctrl+C)
# Restart with tunnel
npx expo start --dev-client --tunnel
```

### Voice Recognition Not Working

**Check logs for:**
```
✅ Speech Recognition module loaded successfully
```

**If not:**
- Rebuild the app
- Check microphone permission
- Restart the app

---

## 📱 Build Profiles

### Development (Current)
- **Purpose:** Testing with native modules
- **Size:** ~50-80 MB
- **Features:** All features + debugging
- **Distribution:** Internal only

### Preview
- **Purpose:** Testing before production
- **Size:** ~30-50 MB
- **Features:** All features, no debugging
- **Distribution:** Internal only

### Production
- **Purpose:** Play Store release
- **Size:** ~20-30 MB (optimized)
- **Features:** All features, optimized
- **Distribution:** Public

---

## 🎯 What You Get

After this build, your app will have:

### Voice Recognition ✅
- Detects trigger words ("Help me", "Emergency")
- Recognizes distress in speech
- AI-powered analysis with Gemini
- Background operation
- Continuous listening

### Loud Sound Detection ✅
- Monitors audio levels
- Detects shouting/screaming
- Reports to backend
- Triggers risk assessment

### All Existing Features ✅
- SOS button
- Shake detection
- Evidence recording
- SMS alerts
- Location sharing
- Evidence vault
- Contact management

---

## 📊 Build Information

**Account:** cartik98  
**Project:** safeher-native  
**Platform:** Android  
**Profile:** development  
**Build Type:** APK  
**Distribution:** Internal  

**Includes:**
- expo-speech-recognition (native)
- expo-dev-client
- All other dependencies

---

## 🔄 Future Builds

### To rebuild:

```bash
eas build --profile development --platform android
```

### To build for production:

```bash
eas build --profile production --platform android
```

### To submit to Play Store:

```bash
eas submit --platform android
```

---

## 💡 Tips

### Faster Builds
- Use `--clear-cache` if build fails
- Use `--local` for local builds (requires Android Studio)

### Testing
- Use development build for testing
- Use preview build for beta testing
- Use production build for release

### Debugging
- Development build has debugging tools
- Can use React Native Debugger
- Can inspect network requests

---

## 📞 Support

### Build Issues
- Check: https://expo.dev/accounts/cartik98/projects/safeher-native/builds
- View build logs
- Check error messages

### Voice Recognition Issues
- Check microphone permission
- Check logs for module loading
- Verify device supports speech recognition

### General Issues
- Check Expo documentation: https://docs.expo.dev/
- Check EAS Build docs: https://docs.expo.dev/build/introduction/

---

## ✅ Success Checklist

After build completes:

- [ ] Download APK from link
- [ ] Install APK on device
- [ ] Run `npx expo start --dev-client`
- [ ] Open app on device
- [ ] Check logs for voice recognition
- [ ] Test voice trigger ("Help me")
- [ ] Test loud sound detection
- [ ] Test SOS button
- [ ] Test shake detection
- [ ] Test evidence recording
- [ ] Verify all features work

---

## 🎉 Next Steps

1. **Wait for build** (10-20 minutes)
2. **Download APK** from link
3. **Install on device**
4. **Run dev server:** `npx expo start --dev-client`
5. **Test voice recognition**
6. **Enjoy full features!**

---

**Build is in progress... Check back in 10-20 minutes!** ⏳

**I'll monitor the build and let you know when it's ready!** 🚀
