# Audio Recording Troubleshooting Guide

## 🐛 Problem: Recording Captures Silence (No Voice)

The recording is working (file is created and uploaded) but no audio/voice is being captured.

---

## 🔍 Possible Causes

### 1. Microphone Permission Not Granted
- App doesn't have permission to access microphone
- Permission was denied or revoked

### 2. Audio Mode Configuration
- Incorrect audio mode settings
- Conflict between recording and playback

### 3. Device-Specific Issues
- Some Android devices have strict audio policies
- Background recording restrictions
- Battery optimization blocking microphone

### 4. Recording Settings
- Wrong audio source
- Incorrect sample rate or bit rate
- Audio encoder issues

---

## ✅ Fixes Applied

### Fix 1: Enhanced Permission Handling

**Added:**
- Explicit permission request with logging
- Alert dialog if permission denied
- Clear error messages

**Code:**
```typescript
const { status } = await Audio.requestPermissionsAsync();
if (status !== 'granted') {
  Alert.alert(
    'Microphone Permission Required',
    'SafeHer needs microphone access to record evidence...'
  );
  return;
}
```

### Fix 2: Improved Audio Mode Configuration

**Changed:**
```typescript
// Before
shouldDuckAndroid: false

// After
shouldDuckAndroid: true  // Allow other audio to play
interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix
interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix
```

### Fix 3: High-Quality Recording Settings

**Added:**
```typescript
const recordingOptions = {
  isMeteringEnabled: true,  // Enable audio level monitoring
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,      // CD quality
    numberOfChannels: 2,     // Stereo
    bitRate: 128000,        // 128 kbps
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MAX,  // Maximum quality
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  }
};
```

### Fix 4: Enhanced Logging

**Added logging for:**
- Permission status
- Audio mode configuration
- Recording status (isRecording, duration, audio level)
- File size (to detect empty recordings)
- Audio metering (to check if sound is being captured)

---

## 🧪 How to Test

### Step 1: Check Logs During Recording

**Trigger SOS and watch for these logs:**

```
🎤 [RECORD] Requesting microphone permission...
🎤 [RECORD] Permission status: granted
⚙️ [RECORD] Setting audio mode...
🎙️ [RECORD] Creating recording instance...
🎙️ [RECORD] Recording options: {...}
🎙️ [RECORD] Recording prepared
🎙️ [RECORD] Recording started
✅ [RECORD] Evidence recording started successfully
```

**After 1 second:**
```
📊 [RECORD] Recording status after 1s: {...}
✅ [RECORD] Recording is active
📊 [RECORD] Audio level: -20  (should be negative number, not 0)
```

**When stopping:**
```
📊 [UPLOAD] Recording status before stop: {...}
📊 [UPLOAD] Was recording: true
📊 [UPLOAD] Duration recorded (ms): 40000
📊 [UPLOAD] Final audio level: -15
📁 [UPLOAD] File size: 512000 bytes
📁 [UPLOAD] File size (MB): 0.50
```

### Step 2: Check File Size

**Good recording:**
```
📁 [UPLOAD] File size: 500000+ bytes (0.5+ MB)
```

**Empty recording (problem):**
```
📁 [UPLOAD] File size: 0 bytes
⚠️ [UPLOAD] WARNING: File size is 0 bytes - recording may be empty!
```

### Step 3: Check Audio Levels

**Good recording (capturing sound):**
```
📊 [RECORD] Audio level: -20
📊 [RECORD] Audio level: -15
📊 [RECORD] Audio level: -25
```

**Silent recording (problem):**
```
📊 [RECORD] Audio level: 0
📊 [RECORD] Audio level: 0
```

---

## 🔧 Manual Checks

### Check 1: Microphone Permission

**Android:**
1. Go to **Settings** → **Apps** → **Expo Go** (or your app)
2. Tap **Permissions**
3. Check **Microphone** is **Allowed**
4. If not, enable it

**iOS:**
1. Go to **Settings** → **Privacy** → **Microphone**
2. Find your app in the list
3. Toggle **ON**

### Check 2: Test Microphone

**Before testing SafeHer:**
1. Open **Voice Recorder** app on your device
2. Record a test message
3. Play it back
4. If this works, microphone is functional

### Check 3: Background Restrictions

**Android:**
1. Go to **Settings** → **Apps** → **Expo Go**
2. Tap **Battery**
3. Select **Unrestricted** or **Optimized**
4. Disable **Background restriction**

### Check 4: Do Not Disturb Mode

- Turn off **Do Not Disturb** mode
- Some devices block microphone in DND mode

---

## 🎯 Expected Behavior

### Successful Recording:

1. **Permission granted** ✅
2. **Audio mode set** ✅
3. **Recording starts** ✅
4. **Audio levels detected** (negative numbers like -20, -15) ✅
5. **File size > 0** (typically 0.5+ MB for 40 seconds) ✅
6. **Recording stops** ✅
7. **File uploaded** ✅
8. **Playback works** ✅

### Failed Recording (Silent):

1. **Permission granted** ✅
2. **Audio mode set** ✅
3. **Recording starts** ✅
4. **Audio levels = 0** ❌ (no sound detected)
5. **File size = 0 or very small** ❌
6. **Recording stops** ✅
7. **File uploaded** ✅
8. **Playback is silent** ❌

---

## 🚨 Common Issues & Solutions

### Issue 1: Permission Denied

**Symptoms:**
```
❌ [RECORD] Microphone permission denied
⚠️ Microphone permission denied
```

**Solution:**
1. Go to device Settings
2. Enable microphone permission for the app
3. Restart the app
4. Try again

### Issue 2: Audio Level Always 0

**Symptoms:**
```
📊 [RECORD] Audio level: 0
📊 [RECORD] Audio level: 0
```

**Solution:**
1. Check if another app is using the microphone
2. Close all other apps
3. Restart the device
4. Try again

### Issue 3: File Size is 0 Bytes

**Symptoms:**
```
📁 [UPLOAD] File size: 0 bytes
⚠️ [UPLOAD] WARNING: File size is 0 bytes
```

**Solution:**
1. Check microphone permission
2. Test microphone with another app
3. Restart the device
4. Check for OS updates

### Issue 4: Recording Fails to Start

**Symptoms:**
```
❌ [RECORD] Recording error: ...
❌ Recording failed: ...
```

**Solution:**
1. Check error message in logs
2. Verify microphone permission
3. Check if device supports recording
4. Try on a different device

---

## 📱 Device-Specific Issues

### Android Issues:

**Samsung Devices:**
- May have strict audio policies
- Check **App permissions** in Settings
- Disable **Battery optimization**

**Xiaomi/MIUI:**
- Check **Autostart** permission
- Disable **Battery saver**
- Enable **Background activity**

**OnePlus/OxygenOS:**
- Check **Battery optimization**
- Enable **Background activity**

### iOS Issues:

**All iOS Devices:**
- Check **Privacy** → **Microphone** settings
- Ensure app is not in **Low Power Mode**
- Check **Screen Time** restrictions

---

## 🔍 Debug Commands

### Check Recording Status:

**In app logs, look for:**
```
[RECORD] - Recording-related logs
[UPLOAD] - Upload-related logs
```

### Check File Info:

**Look for:**
```
📁 [UPLOAD] File size: X bytes
📁 [UPLOAD] File size (MB): X.XX
```

### Check Audio Levels:

**Look for:**
```
📊 [RECORD] Audio level: X
```

**Good:** Negative numbers (-20, -15, -30)  
**Bad:** Zero (0, 0, 0)

---

## ✅ Verification Checklist

After applying fixes, verify:

- [ ] Microphone permission granted
- [ ] Recording starts successfully
- [ ] Audio levels are detected (negative numbers)
- [ ] File size > 0 (typically 0.5+ MB)
- [ ] Recording stops successfully
- [ ] File uploads successfully
- [ ] Playback works with audible sound
- [ ] No errors in logs

---

## 🎤 Test Recording

### Quick Test:

1. **Trigger SOS alert**
2. **Speak loudly** during the alert
3. **Say:** "This is a test recording. Testing one, two, three."
4. **Wait** for recording to complete
5. **Check logs** for audio levels
6. **Play back** the recording
7. **Verify** you can hear your voice

### Expected Logs:

```
✅ [RECORD] Evidence recording started successfully
📊 [RECORD] Audio level: -18  ← Should see negative numbers
📊 [UPLOAD] File size: 524288 bytes  ← Should be > 0
✅ [UPLOAD] Evidence uploaded successfully!
```

---

## 📞 Still Not Working?

If recording still captures silence after all fixes:

### Try These:

1. **Test on a different device**
   - Rules out device-specific issues

2. **Test with a different app**
   - Verify microphone hardware works

3. **Check OS version**
   - Update to latest OS version

4. **Factory reset** (last resort)
   - Backup data first
   - Reset device to factory settings

### Report Issue:

If problem persists, provide:
- Device model and OS version
- Complete logs from [RECORD] and [UPLOAD]
- File size from logs
- Audio level values from logs
- Screenshot of permission settings

---

## 🎉 Success Indicators

**Recording is working correctly when you see:**

✅ Permission granted  
✅ Recording started  
✅ Audio levels: -20, -15, -25 (negative numbers)  
✅ File size: 500KB+ (0.5+ MB)  
✅ Recording stopped  
✅ File uploaded  
✅ Playback has audible sound  

---

**Status:** ✅ Fixes applied - Ready for testing

**Next Step:** Trigger SOS and check logs for audio levels and file size
