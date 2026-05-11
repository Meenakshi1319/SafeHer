# SOS Alert System with 3-Stage Escalation

## Overview
Implemented a comprehensive SOS alert system with loud sirens, vibration, countdown timers, and automatic escalation to emergency contacts.

## Features

### 🚨 3-Stage Alert System

**Stage 1: First Alert (10 seconds)**
- Loud siren sound plays
- Phone vibrates continuously
- Modal shows "EMERGENCY ALERT"
- Countdown from 10 seconds
- User can respond: "I AM SAFE" or "I AM NOT SAFE"

**Gap 1: Waiting Period (5 seconds)**
- Sound stops
- Vibration stops
- Modal shows "ARE YOU SAFE?"
- Countdown from 5 seconds
- User can still respond

**Stage 2: Second Alert (10 seconds)**
- Siren plays again (louder)
- Vibration resumes
- Modal shows "🚨🚨 EMERGENCY ALERT"
- Countdown from 10 seconds
- User can respond

**Gap 2: Final Waiting Period (5 seconds)**
- Sound stops
- Modal shows "Last chance to respond..."
- Countdown from 5 seconds
- Warning: "Emergency contacts will be alerted"

**Stage 3: Final Alert (10 seconds)**
- Siren plays (maximum volume)
- Vibration at full intensity
- Modal shows "🚨🚨🚨 EMERGENCY ALERT"
- Countdown from 10 seconds
- Warning: "Emergency contacts will be notified"

**Escalation: No Response**
- If user doesn't respond after all 3 alerts
- Automatically sends alerts to:
  - ✓ Family & Trusted Contacts
  - ✓ Nearby Volunteers
  - ✓ NGOs
  - ✓ Police & Emergency Services
- Shares live location
- Sends maximum risk score (100)

### 🎵 Audio Features

- **Loud Siren**: Uses `assets/siren.ogg`
- **Plays in Silent Mode**: Works even if phone is on silent
- **Looping**: Continuous sound during alert phases
- **Volume**: Maximum (1.0)
- **Background Play**: Continues even if app is backgrounded

### 📳 Vibration Pattern

- **Pattern**: 1 second on, 0.5 seconds off
- **Continuous**: Loops during alert phases
- **Stops**: During gap periods
- **Cancels**: When user responds

### ⏱️ Timeline

```
0s  ─► Alert 1 (10s) ─► Gap 1 (5s) ─► Alert 2 (10s) ─► Gap 2 (5s) ─► Alert 3 (10s) ─► Escalate
     🚨 LOUD           ⏸️ QUIET      🚨🚨 LOUD        ⏸️ QUIET      🚨🚨🚨 LOUD      📡 SEND
```

**Total Time**: 40 seconds before escalation

### 🎯 User Actions

**1. "I AM SAFE" Button (Green)**
- Stops all alerts immediately
- Cancels escalation
- Shows confirmation: "✅ Safety Confirmed"
- Returns to normal state

**2. "I AM NOT SAFE" Button (Red)**
- Stops alerts immediately
- **Immediately escalates** (doesn't wait)
- Sends alerts to all emergency contacts
- Shares location
- Shows: "🚨 EMERGENCY ALERT SENT"

**3. No Response**
- After 40 seconds of no response
- Automatically escalates
- Same as clicking "I AM NOT SAFE"

## Files Created/Modified

### New Files

1. **`src/features/emergency/hooks/useSOSAlertSystem.ts`**
   - Main alert system logic
   - 3-stage alert sequence
   - Sound and vibration control
   - Escalation logic
   - Contact fetching and notification

### Modified Files

1. **`app/(tabs)/index.tsx`**
   - Integrated new alert system
   - Added alert modal UI
   - Added countdown display
   - Added action buttons
   - Added phase indicators

## UI Components

### Alert Modal

**Header**
- Emoji indicator (🚨, ⏸️, 📡)
- Phase title
- Changes based on current phase

**Countdown Display**
- Large number (64pt font)
- Red color (#E66A6A)
- "seconds" label
- Updates every 100ms

**Description Text**
- Explains current phase
- Guides user action
- Changes per phase

**Action Buttons**
- "I AM SAFE" (Green) - Cancels alert
- "I AM NOT SAFE" (Red) - Immediate escalation
- Large, easy to tap
- Icons + text

**Warning Box**
- Shows on final alert
- Red border
- Warns about auto-escalation

**Escalation Info**
- Shows during escalation
- Lists what's happening:
  - Alerting contacts
  - Notifying volunteers
  - Contacting police
  - Sharing location

## Technical Details

### Audio Configuration

```typescript
await Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,      // Works on silent
  staysActiveInBackground: true,    // Continues in background
  shouldDuckAndroid: false,         // Full volume on Android
});
```

### Sound Loading

```typescript
const { sound } = await Audio.Sound.createAsync(
  require('../../../../assets/siren.ogg'),
  { 
    isLooping: true,    // Continuous play
    volume: 1.0,        // Maximum volume
    shouldPlay: true    // Start immediately
  }
);
```

### Vibration Pattern

```typescript
Vibration.vibrate([0, 1000, 500], true);
// [initial delay, vibrate duration, pause duration], repeat
```

### Timer Management

- Uses `setTimeout` for phase transitions
- Uses `setInterval` for countdown updates
- All timers cleaned up on unmount
- Timers cancelled when user responds

## Escalation Logic

### Contact Fetching

```typescript
const contactsResponse = await apiGet(`/contacts/${uid}`);
const contacts = contactsResponse?.contacts || [];

// Filter for emergency contacts
const emergencyContacts = contacts.filter((c: any) => 
  ['family', 'trusted', 'volunteer', 'police', 'ngo'].includes(c.type)
);
```

### SOS Trigger

```typescript
await apiPost('/trigger-sos', {
  uid,
  reason: 'User did not respond to safety check - EMERGENCY',
  riskScore: 100,              // Maximum risk
  location,                    // GPS coordinates
  escalated: true,             // Flag as escalated
  contactCount: emergencyContacts.length
});
```

## Integration with Existing Features

### Shake Detection
- Triggers new alert system
- Disabled during active alert
- Re-enabled after alert ends

### Voice Recognition
- Can trigger new alert system
- Works alongside shake detection
- Disabled during active alert

### Evidence Recording
- Original SOS action still available
- Can be triggered separately
- Records audio during alert

## Testing Checklist

### Audio Test
- [ ] Siren plays loudly
- [ ] Works in silent mode
- [ ] Loops continuously
- [ ] Stops during gaps
- [ ] Stops when user responds

### Vibration Test
- [ ] Vibrates during alerts
- [ ] Stops during gaps
- [ ] Stops when user responds
- [ ] Pattern is noticeable

### Timer Test
- [ ] Countdown displays correctly
- [ ] Updates every second
- [ ] Transitions between phases
- [ ] Total time is 40 seconds

### Button Test
- [ ] "I AM SAFE" stops alert
- [ ] "I AM SAFE" shows confirmation
- [ ] "I AM NOT SAFE" escalates immediately
- [ ] Buttons are easy to tap

### Escalation Test
- [ ] No response triggers escalation
- [ ] Contacts are fetched
- [ ] SOS API is called
- [ ] Location is shared
- [ ] Confirmation is shown

### Integration Test
- [ ] Shake triggers alert
- [ ] Voice triggers alert
- [ ] SOS button triggers alert
- [ ] Only one alert at a time
- [ ] Cleanup on unmount

## User Flow Diagram

```
User Triggers SOS
    ↓
Alert 1 (10s) 🚨
    ↓
User responds? ──YES──► "I AM SAFE" ──► Cancel ✅
    ↓ NO                    OR
Gap 1 (5s) ⏸️           "I AM NOT SAFE" ──► Escalate 📡
    ↓
Alert 2 (10s) 🚨🚨
    ↓
User responds? ──YES──► (same as above)
    ↓ NO
Gap 2 (5s) ⏸️
    ↓
Alert 3 (10s) 🚨🚨🚨
    ↓
User responds? ──YES──► (same as above)
    ↓ NO
Auto Escalate 📡
    ↓
Send to:
- Family & Trusted
- Volunteers
- Police
- NGOs
```

## Safety Features

1. **Multiple Chances**: 3 alerts + 2 gaps = 5 opportunities to respond
2. **Clear Feedback**: Visual countdown, phase indicators, descriptions
3. **Easy Actions**: Large buttons, clear labels
4. **Immediate Help**: "I AM NOT SAFE" escalates instantly
5. **Auto-Escalation**: Ensures help comes even if user can't respond
6. **Location Sharing**: GPS coordinates sent to all contacts
7. **Maximum Priority**: Risk score 100 ensures immediate response

## Customization Options

### Timing (in useSOSAlertSystem.ts)

```typescript
// Alert duration
setTimeout(async () => { ... }, 10000);  // Change 10000 to adjust

// Gap duration
setTimeout(async () => { ... }, 5000);   // Change 5000 to adjust
```

### Sound

- Replace `assets/siren.ogg` with your own sound file
- Adjust volume: `volume: 1.0` (0.0 to 1.0)
- Change looping: `isLooping: true/false`

### Vibration

```typescript
Vibration.vibrate([0, 1000, 500], true);
// [delay, vibrate_ms, pause_ms], repeat
```

### Contact Types

```typescript
['family', 'trusted', 'volunteer', 'police', 'ngo']
// Add or remove types as needed
```

## Known Limitations

1. **iOS Silent Mode**: May not work on all iOS versions
2. **Background Restrictions**: Some Android versions may kill background audio
3. **Battery Saver**: May affect timers and sound
4. **Do Not Disturb**: May block sound on some devices

## Recommendations

1. **Test on Real Device**: Emulators don't support full audio/vibration
2. **Test in Silent Mode**: Ensure siren plays
3. **Test with Screen Off**: Ensure alerts continue
4. **Test Battery Saver**: Ensure timers work
5. **Add to Onboarding**: Explain the 3-alert system to users

## Future Enhancements

1. **Customizable Timing**: Let users adjust alert/gap durations
2. **Volume Control**: Let users set siren volume
3. **Custom Sounds**: Let users upload their own alert sound
4. **Flashlight**: Flash phone light during alerts
5. **Screen Flash**: Flash screen red during alerts
6. **Voice Announcements**: "This is an emergency alert"
7. **Countdown Voice**: "10, 9, 8..." spoken countdown
8. **Location Updates**: Send location every 5 seconds during alert
9. **Photo Capture**: Auto-capture photos during alert
10. **Video Recording**: Auto-record video during alert

## Support

If alerts don't work:
1. Check audio permissions
2. Check notification permissions
3. Disable battery optimization for SafeHer
4. Disable Do Not Disturb
5. Test with volume up
6. Restart the app

---

**Status**: ✅ Fully Implemented
**Version**: 1.0.0
**Last Updated**: May 11, 2026
