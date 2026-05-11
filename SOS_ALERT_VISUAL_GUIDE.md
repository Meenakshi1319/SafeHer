# SOS Alert System - Visual Guide

## 📱 Screen Flow

### Stage 1: First Alert (10 seconds)
```
┌─────────────────────────────────────┐
│                                     │
│            🚨                       │
│      EMERGENCY ALERT                │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │            10                 │ │
│  │          seconds              │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  First alert - Respond if you      │
│  are safe                          │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  ✅  I AM SAFE               │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  🚨  I AM NOT SAFE           │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

🔊 LOUD SIREN PLAYING
📳 PHONE VIBRATING
```

### Gap 1: Waiting Period (5 seconds)
```
┌─────────────────────────────────────┐
│                                     │
│            ⏸️                       │
│        ARE YOU SAFE?                │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │             5                 │ │
│  │          seconds              │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  Waiting for your response...      │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  ✅  I AM SAFE               │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  🚨  I AM NOT SAFE           │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

🔇 SOUND STOPPED
📳 VIBRATION STOPPED
```

### Stage 2: Second Alert (10 seconds)
```
┌─────────────────────────────────────┐
│                                     │
│           🚨🚨                      │
│      EMERGENCY ALERT                │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │            10                 │ │
│  │          seconds              │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  Second alert - Please respond      │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  ✅  I AM SAFE               │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  🚨  I AM NOT SAFE           │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

🔊 LOUD SIREN PLAYING
📳 PHONE VIBRATING
```

### Gap 2: Final Warning (5 seconds)
```
┌─────────────────────────────────────┐
│                                     │
│            ⏸️                       │
│        ARE YOU SAFE?                │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │             5                 │ │
│  │          seconds              │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  Last chance to respond...          │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  ✅  I AM SAFE               │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  🚨  I AM NOT SAFE           │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ ⚠️ If you don't respond,     │ │
│  │ emergency contacts will be    │ │
│  │ alerted automatically         │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

🔇 SOUND STOPPED
📳 VIBRATION STOPPED
```

### Stage 3: Final Alert (10 seconds)
```
┌─────────────────────────────────────┐
│                                     │
│          🚨🚨🚨                     │
│      EMERGENCY ALERT                │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │            10                 │ │
│  │          seconds              │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  Final alert - Emergency contacts   │
│  will be notified                   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  ✅  I AM SAFE               │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  🚨  I AM NOT SAFE           │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ ⚠️ If you don't respond,     │ │
│  │ emergency contacts will be    │ │
│  │ alerted automatically         │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

🔊 MAXIMUM VOLUME SIREN
📳 MAXIMUM VIBRATION
```

### Escalation: Sending Alerts
```
┌─────────────────────────────────────┐
│                                     │
│            📡                       │
│      SENDING ALERTS...              │
│                                     │
│  ┌───────────────────────────────┐ │
│  │                               │ │
│  │  Notifying emergency          │ │
│  │  contacts and nearby          │ │
│  │  volunteers                   │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ ✓ Alerting family & trusted   │ │
│  │   contacts                    │ │
│  │ ✓ Notifying nearby volunteers │ │
│  │ ✓ Contacting police &         │ │
│  │   emergency services          │ │
│  │ ✓ Sharing your live location  │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘

🔇 SOUND STOPPED
📳 VIBRATION STOPPED
📡 SENDING ALERTS
```

## ⏱️ Timeline Visualization

```
Time:  0s    10s   15s   25s   30s   40s
       │     │     │     │     │     │
       ▼     ▼     ▼     ▼     ▼     ▼
      ┌─────┐     ┌─────┐     ┌─────┐
      │ 🚨  │     │ 🚨🚨│     │🚨🚨🚨│
      │Alert│     │Alert│     │Alert│
      │  1  │     │  2  │     │  3  │
      └─────┘     └─────┘     └─────┘
           ┌───┐       ┌───┐       ┌────┐
           │⏸️ │       │⏸️ │       │ 📡 │
           │Gap│       │Gap│       │Send│
           │ 1 │       │ 2 │       │    │
           └───┘       └───┘       └────┘

Sound: 🔊───🔇─🔊───🔇─🔊───🔇
Vibe:  📳───⏹️─📳───⏹️─📳───⏹️
```

## 🎯 User Actions

### Action 1: "I AM SAFE" ✅
```
User taps "I AM SAFE"
         ↓
    Stop sound 🔇
         ↓
  Stop vibration ⏹️
         ↓
   Cancel timers ⏱️
         ↓
  Show confirmation
         ↓
┌─────────────────────────┐
│   ✅ Safety Confirmed   │
│                         │
│ SOS alert cancelled.    │
│ Stay safe!              │
└─────────────────────────┘
         ↓
   Return to home
```

### Action 2: "I AM NOT SAFE" 🚨
```
User taps "I AM NOT SAFE"
         ↓
    Stop sound 🔇
         ↓
  Stop vibration ⏹️
         ↓
   Cancel timers ⏱️
         ↓
 Get GPS location 📍
         ↓
 Fetch contacts 👥
         ↓
  Send SOS API 📡
         ↓
┌─────────────────────────┐
│ 🚨 EMERGENCY ALERT SENT │
│                         │
│ Alert sent to 5         │
│ emergency contacts:     │
│                         │
│ ✓ Family & Trusted      │
│ ✓ Nearby Volunteers     │
│ ✓ Police & Emergency    │
│                         │
│ Your location has been  │
│ shared.                 │
└─────────────────────────┘
         ↓
   Return to home
```

### Action 3: No Response ⏰
```
40 seconds pass
         ↓
    Stop sound 🔇
         ↓
  Stop vibration ⏹️
         ↓
 Get GPS location 📍
         ↓
 Fetch contacts 👥
         ↓
  Send SOS API 📡
         ↓
┌─────────────────────────┐
│ 🚨 EMERGENCY ALERT SENT │
│                         │
│ (Same as "NOT SAFE")    │
└─────────────────────────┘
         ↓
   Return to home
```

## 🎨 Color Scheme

### Alert Modal
- **Background**: Dark (#1B1620)
- **Border**: Red (#E66A6A)
- **Glow**: Red shadow

### Countdown
- **Number**: Red (#E66A6A)
- **Background**: Dark purple (#6D3B4B)
- **Border**: Red (#E66A6A)

### Buttons
- **"I AM SAFE"**: Green (#4CAF50)
- **"I AM NOT SAFE"**: Red (#E66A6A)
- **Text**: Light (#F5E6D3)

### Warning Box
- **Background**: Red transparent
- **Border**: Red (#E66A6A)
- **Text**: Red (#E66A6A)

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Total Duration | 40 seconds |
| Alert Phases | 3 |
| Gap Phases | 2 |
| Alert Duration | 10 seconds each |
| Gap Duration | 5 seconds each |
| Response Opportunities | 5 |
| Sound Loops | 3 |
| Vibration Cycles | 3 |

## 🔔 Sound & Vibration

### Sound Pattern
```
Alert 1:  🔊🔊🔊🔊🔊🔊🔊🔊🔊🔊 (10s)
Gap 1:    🔇🔇🔇🔇🔇 (5s)
Alert 2:  🔊🔊🔊🔊🔊🔊🔊🔊🔊🔊 (10s)
Gap 2:    🔇🔇🔇🔇🔇 (5s)
Alert 3:  🔊🔊🔊🔊🔊🔊🔊🔊🔊🔊 (10s)
```

### Vibration Pattern
```
Alert 1:  📳─📳─📳─📳─📳─📳─📳─📳─📳─📳 (10s)
Gap 1:    ⏹️⏹️⏹️⏹️⏹️ (5s)
Alert 2:  📳─📳─📳─📳─📳─📳─📳─📳─📳─📳 (10s)
Gap 2:    ⏹️⏹️⏹️⏹️⏹️ (5s)
Alert 3:  📳─📳─📳─📳─📳─📳─📳─📳─📳─📳 (10s)

Pattern: 1000ms ON, 500ms OFF, repeat
```

## 🎯 Key Features

✅ **3 Loud Alerts** - Each 10 seconds
✅ **2 Quiet Gaps** - Each 5 seconds  
✅ **Countdown Timer** - Real-time display
✅ **Loud Siren** - Works in silent mode
✅ **Strong Vibration** - Continuous pattern
✅ **2 Action Buttons** - Safe / Not Safe
✅ **Auto-Escalation** - After 40 seconds
✅ **Emergency Contacts** - All types notified
✅ **Location Sharing** - GPS coordinates sent
✅ **Visual Feedback** - Phase indicators
✅ **Warning Messages** - Clear communication

## 🚀 How to Test

1. **Tap SOS button** on home screen
2. **Wait and observe** the 3-stage sequence
3. **Test "I AM SAFE"** - Should cancel immediately
4. **Test "I AM NOT SAFE"** - Should escalate immediately
5. **Test no response** - Should auto-escalate after 40s
6. **Check sound** - Should be loud even in silent mode
7. **Check vibration** - Should feel strong
8. **Check contacts** - Should receive alerts

---

**The system ensures help arrives even if the user cannot respond!** 🛡️
