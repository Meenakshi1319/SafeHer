# Speech Recognition Module Error - Fix Guide

## 🐛 Error

```
❌ Speech Recognition module not available: Cannot find native module 'ExpoSpeechRecognition'
```

## 🔍 Cause

The `expo-speech-recognition` package requires native modules that need to be rebuilt. This happens when:
1. Package was added after initial build
2. Native modules weren't linked properly
3. App needs to be rebuilt with the new native code

## ✅ Solution

### Option 1: Rebuild the App (Recommended)

The native module needs to be compiled into the app.

**For Development (Expo Go):**
```bash
# Stop the current app
# Press Ctrl+C in the terminal

# Clear cache and restart
npx expo start --clear

# If that doesn't work, try:
npx expo prebuild --clean
npx expo run:android
# or
npx expo run:ios
```

**For Production Build:**
```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

### Option 2: Disable Voice Recognition (Quick Fix)

If you don't need voice recognition right now, the app will continue to work without it. The code already handles this gracefully.

**What still works:**
- ✅ SOS button
- ✅ Shake detection
- ✅ Evidence recording
- ✅ SMS alerts
- ✅ All other features

**What won't work:**
- ❌ Voice trigger ("Help me", "Emergency", etc.)

---

## 🎯 Current Status

The app is already handling this error gracefully:

```javascript
try {
  const module = require("expo-speech-recognition");
  SpeechRecognition = module.ExpoSpeechRecognitionModule;
  isModuleAvailable = true;
  console.log("✅ Speech Recognition module loaded successfully");
} catch (error) {
  console.log("❌ Speech Recognition module not available:", error.message);
  SpeechRecognition = null;
  isModuleAvailable = false;
}
```

**Result:**
- App continues to run ✅
- Voice trigger is disabled ⚠️
- All other features work ✅

---

## 🔧 Detailed Fix Steps

### Step 1: Clear Cache

```bash
# Stop the app (Ctrl+C)

# Clear Expo cache
npx expo start --clear
```

### Step 2: Rebuild Native Modules

**If using Expo Go:**
```bash
# Expo Go doesn't support custom native modules
# You need to create a development build

npx expo prebuild
npx expo run:android
# or
npx expo run:ios
```

**If using EAS Build:**
```bash
# Create development build
eas build --profile development --platform android

# Install the build on your device
# Then run:
npx expo start --dev-client
```

### Step 3: Verify Installation

After rebuilding, check logs:

**Success:**
```
✅ Speech Recognition module loaded successfully
🎤 Speech Recognition available: true
✅ Voice and sound safety monitor active
```

**Still failing:**
```
❌ Speech Recognition module not available
❌ Speech Recognition not available on this device
```

---

## 🎤 Testing Voice Recognition

Once rebuilt, test voice recognition:

1. **Open the app**
2. **Check logs** for:
   ```
   ✅ Speech Recognition module loaded successfully
   ✅ Voice and sound safety monitor active
   ```
3. **Say trigger words:**
   - "Help me"
   - "Emergency"
   - "Save me"
   - "Bachao"
4. **Check if SOS triggers**

---

## 📱 Platform-Specific Notes

### Android

**Requirements:**
- Android 5.0+ (API 21+)
- Google Play Services
- Microphone permission

**Common Issues:**
- Google Speech Recognition not installed
- Microphone permission denied
- Device doesn't support speech recognition

### iOS

**Requirements:**
- iOS 13.0+
- Speech Recognition permission
- Microphone permission

**Common Issues:**
- Speech Recognition permission denied
- Siri disabled in Settings
- Device doesn't support speech recognition

---

## 🚨 If Rebuild Doesn't Work

### Check Package Installation

```bash
# Verify package is installed
npm list expo-speech-recognition

# Should show:
# expo-speech-recognition@3.1.3
```

### Reinstall Package

```bash
# Remove package
npm uninstall expo-speech-recognition

# Clear cache
npm cache clean --force

# Reinstall
npm install expo-speech-recognition@3.1.3

# Rebuild
npx expo prebuild --clean
npx expo run:android
```

### Check Expo SDK Compatibility

```bash
# Check Expo SDK version
npx expo --version

# Should be 54.x.x
```

**If version mismatch:**
```bash
# Update Expo
npm install expo@latest

# Update all Expo packages
npx expo install --fix
```

---

## 🎯 Alternative: Use Without Voice Recognition

If you can't rebuild right now, the app works fine without voice recognition:

**Available triggers:**
- ✅ **SOS Button** - Tap to trigger
- ✅ **Shake Detection** - Shake phone 3 times
- ✅ **Manual Trigger** - From any screen

**Not available:**
- ❌ **Voice Trigger** - "Help me", "Emergency", etc.

**All other features work:**
- ✅ Evidence recording
- ✅ SMS alerts
- ✅ Location sharing
- ✅ Evidence vault
- ✅ Contact management

---

## 📊 Error Handling Status

The app already handles this error gracefully:

**What happens:**
1. App tries to load speech recognition module
2. Module not found (native code not built)
3. App logs error but continues
4. Voice trigger is disabled
5. All other features work normally

**No crash, no blocking issues** ✅

---

## 🎉 Summary

**Quick Fix:** App works without voice recognition - just use SOS button or shake detection

**Proper Fix:** Rebuild app with native modules
```bash
npx expo start --clear
npx expo prebuild --clean
npx expo run:android
```

**Status:** ⚠️ Voice trigger disabled, all other features working

**Impact:** Low - Voice trigger is optional, main SOS features work fine

---

## 📞 Need Help?

If rebuild doesn't work:

1. **Check Expo version:** `npx expo --version` (should be 54.x.x)
2. **Check Node version:** `node --version` (should be 18.x.x or higher)
3. **Check package:** `npm list expo-speech-recognition`
4. **Clear everything:**
   ```bash
   rm -rf node_modules
   rm package-lock.json
   npm install
   npx expo prebuild --clean
   ```

---

**For now, the app works fine without voice recognition. You can rebuild later when convenient.** ✅
