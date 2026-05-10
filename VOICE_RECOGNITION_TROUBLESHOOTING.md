# Voice Recognition Troubleshooting Guide

## 🎤 Voice Recognition Not Working? Follow These Steps

### Step 1: Check Device Compatibility

**iOS:**
- iOS 13.0 or later required
- Works on all iPhones with iOS 13+
- iPad also supported

**Android:**
- Android 5.0 (API 21) or later required
- Google app must be installed
- Speech recognition services must be enabled

### Step 2: Verify Permissions

#### iOS:
1. Go to **Settings** → **SafeHer**
2. Enable **Microphone** permission
3. Enable **Speech Recognition** permission

#### Android:
1. Go to **Settings** → **Apps** → **SafeHer**
2. Go to **Permissions**
3. Enable **Microphone** permission
4. Enable **Speech Recognition** (if available)

### Step 3: Test Voice Recognition

1. Open SafeHer app
2. Go to **Profile** tab (bottom right)
3. Tap **Voice Test** under APP section
4. Tap **▶️ Start** button
5. Check the status shows "ACTIVE"
6. Say "Help me" clearly
7. Watch the logs for detection

### Step 4: Common Issues & Solutions

#### Issue: "Speech Recognition not available"

**Solution:**
- **iOS**: Make sure Siri is enabled in Settings
- **Android**: Install/update Google app from Play Store
- Restart the device
- Check internet connection (required for first-time setup)

#### Issue: Voice not detected

**Solutions:**
1. **Speak clearly and loudly**
   - Say trigger words distinctly
   - Avoid background noise
   - Hold phone closer to mouth

2. **Check microphone**
   - Test microphone in voice recorder app
   - Clean microphone opening
   - Remove phone case if blocking mic

3. **Restart voice recognition**
   - Go to Voice Test screen
   - Tap **⏹️ Stop**
   - Wait 2 seconds
   - Tap **▶️ Start** again

#### Issue: Permissions denied

**Solution:**
1. Uninstall and reinstall the app
2. Grant all permissions when prompted
3. Or manually enable in device Settings

#### Issue: Works sometimes, not always

**Solutions:**
- **Background noise**: Move to quieter location
- **Battery saver**: Disable battery optimization for SafeHer
- **Network**: Ensure stable internet connection
- **Memory**: Close other apps to free up RAM

### Step 5: Trigger Words

Make sure you're saying one of these exact phrases:

✅ **English:**
- "Help me"
- "Save me"
- "Emergency"
- "Stop"
- "Please help"

✅ **Hindi:**
- "Bachao" (बचाओ)

**Tips:**
- Speak naturally, not too fast or slow
- Say the complete phrase
- Avoid mumbling or whispering
- Wait 1-2 seconds between attempts

### Step 6: Check Logs

1. Go to **Voice Test** screen
2. Start voice recognition
3. Say a trigger word
4. Check logs for:
   - ✅ "Speech detected: [your words]"
   - ✅ "VOICE TRIGGER DETECTED"
   - ❌ "No trigger word detected"
   - ❌ "Voice recognition error"

### Step 7: Advanced Debugging

#### Enable Developer Mode:
1. Open Voice Test screen
2. Tap **🔄 Check Status**
3. Note the "Available" status
4. Check console logs in development mode

#### Console Logs to Look For:
```
✅ Speech Recognition module loaded successfully
✅ Speech Recognition available: true
✅ Voice and sound safety monitor active
✅ Speech recognition started successfully
🎤 Speech detected: help me
🚨 VOICE TRIGGER DETECTED: help me
```

#### Error Logs:
```
❌ Speech Recognition module not available
❌ Speech Recognition not available on this device
❌ Microphone permission denied
❌ Voice recognition start error
```

### Step 8: Platform-Specific Issues

#### iOS Specific:

**Issue: "Speech recognition not available"**
- Enable Siri: Settings → Siri & Search → Enable Siri
- Enable Dictation: Settings → General → Keyboard → Enable Dictation
- Check language: Settings → General → Language & Region

**Issue: Stops after a few seconds**
- This is normal iOS behavior
- App automatically restarts recognition
- Look for "🔄 Recognition ended, restarting..." in logs

#### Android Specific:

**Issue: "Google app required"**
- Install Google app from Play Store
- Update to latest version
- Enable "OK Google" detection

**Issue: "Speech services not available"**
- Go to Settings → Apps → Google
- Enable all permissions
- Clear cache and data
- Restart device

### Step 9: Test in Development

If you're a developer:

```bash
# Start the app with logs
npm start

# Watch for voice recognition logs
# Look for messages starting with:
# 🎤 🚨 ✅ ❌
```

### Step 10: Still Not Working?

1. **Rebuild the app:**
   ```bash
   # Clear cache
   npm start -- --reset-cache
   
   # Rebuild
   npm run android  # or npm run ios
   ```

2. **Check expo-speech-recognition version:**
   ```bash
   npm list expo-speech-recognition
   # Should be: expo-speech-recognition@3.1.3
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   npm install
   ```

4. **Check app.json configuration:**
   - Verify expo-speech-recognition plugin is listed
   - Check permissions are configured

## 🔧 Quick Fixes

### Fix 1: Restart Everything
```bash
1. Close SafeHer app completely
2. Restart your phone
3. Open SafeHer
4. Go to Voice Test
5. Start listening
```

### Fix 2: Reset Permissions
```bash
1. Uninstall SafeHer
2. Restart phone
3. Reinstall SafeHer
4. Grant all permissions
5. Test voice recognition
```

### Fix 3: Update Everything
```bash
1. Update SafeHer to latest version
2. Update OS to latest version
3. Update Google app (Android)
4. Restart device
```

## 📊 Expected Behavior

### When Working Correctly:

1. **On App Start:**
   - Console shows: "✅ Speech Recognition module loaded"
   - Console shows: "✅ Voice and sound safety monitor active"

2. **When Speaking:**
   - Console shows: "🎤 Speech detected: [your words]"
   - If trigger word: "🚨 VOICE TRIGGER DETECTED"
   - Alert appears: "Voice Trigger Detected!"
   - SOS process begins

3. **In Voice Test:**
   - Status shows "Available: YES"
   - Status shows "Listening: ACTIVE"
   - Logs show speech detection
   - Trigger words cause alerts

## 🆘 Get Help

If voice recognition still doesn't work after trying all steps:

1. **Check GitHub Issues:**
   - https://github.com/Meenakshi1319/SafeHer/issues
   - Search for "voice recognition"
   - Create new issue with:
     - Device model
     - OS version
     - Error logs
     - Steps tried

2. **Contact Support:**
   - Include Voice Test logs
   - Include console output
   - Describe exact behavior
   - Mention device details

## ✅ Success Checklist

- [ ] Device is compatible (iOS 13+ or Android 5+)
- [ ] Microphone permission granted
- [ ] Speech recognition permission granted
- [ ] Google app installed (Android)
- [ ] Siri enabled (iOS)
- [ ] Voice Test shows "Available: YES"
- [ ] Voice Test shows "Listening: ACTIVE"
- [ ] Trigger words cause detection in logs
- [ ] Alert appears when trigger word spoken
- [ ] SOS activates on trigger word

## 📝 Report Template

When reporting issues, include:

```
**Device:** [iPhone 14 / Samsung Galaxy S21 / etc.]
**OS:** [iOS 17.2 / Android 13 / etc.]
**App Version:** [1.0.0]

**Voice Test Status:**
- Available: [YES/NO]
- Listening: [ACTIVE/INACTIVE]

**Permissions:**
- Microphone: [Granted/Denied]
- Speech Recognition: [Granted/Denied]

**Logs:**
[Paste logs from Voice Test screen]

**Steps Tried:**
- [ ] Restarted app
- [ ] Restarted device
- [ ] Reinstalled app
- [ ] Checked permissions
- [ ] Tested in Voice Test screen

**Behavior:**
[Describe what happens when you say trigger words]
```

---

**Remember:** Voice recognition requires:
1. ✅ Microphone permission
2. ✅ Speech recognition permission
3. ✅ Internet connection (first time)
4. ✅ Clear speech
5. ✅ Quiet environment

**Most common fix:** Restart the app and device, then test in Voice Test screen!
