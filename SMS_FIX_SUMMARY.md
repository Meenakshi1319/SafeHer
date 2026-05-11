# SMS Dispatch Fix - Summary

## Problem
SMS is not being sent to trusted contacts when SOS is triggered.

## Solution
Added comprehensive logging throughout the SMS dispatch pipeline to identify where the flow breaks.

## Changes Made

### 1. Backend - coreServices.js

#### triggerEmergency Function
- Added logging for function call with parameters
- Added risk level calculation logging
- Added Firestore save confirmation
- Added dispatch call logging
- Added completion logging

#### dispatchByRiskLevel Function
- Added function call logging with all parameters
- Added contacts fetch logging (total count and types)
- Added allowed types logging based on risk level
- Added filtered targets logging (count, names, phones)
- Added SMS message preparation logging
- Added SMS sending results logging (successful/failed counts)

#### sendSMS Function
- Added SMS attempt logging
- Added Twilio client validation logging
- Added Twilio phone number validation logging
- Added Twilio API call logging
- Added success logging with SID and status
- Added detailed error logging with error code and details

### 2. Frontend - useSOSAlertSystem.ts

#### escalateToContacts Function
- Added escalation start logging
- Added user ID logging
- Added location permission and retrieval logging
- Added contacts fetch logging with response
- Added emergency contacts filtering logging
- Added SOS trigger payload logging
- Added SOS response logging
- Added completion logging

## How to Test

### 1. Start Backend
```bash
cd backend
npm start
```

### 2. Trigger SOS
- Tap SOS button
- Wait or click button

### 3. Check Logs

**Frontend (look for `[ESCALATE]`):**
```
🚨 [ESCALATE] Starting escalation...
👥 [ESCALATE] Emergency contacts: 2
📤 [ESCALATE] Sending trigger-sos request...
```

**Backend (look for `[EMERGENCY]` and `[SMS]`):**
```json
{"tag":"INFO","message":"🚨 [EMERGENCY] triggerEmergency called"}
{"tag":"INFO","message":"📤 [SMS] dispatchByRiskLevel called"}
{"tag":"INFO","message":"📋 [SMS] Fetched contacts","totalContacts":3}
{"tag":"INFO","message":"👥 [SMS] Filtered target contacts","totalTargets":2}
{"tag":"INFO","message":"📱 [SMS] Attempting to send SMS"}
{"tag":"INFO","message":"✅ [SMS] SMS sent successfully"}
```

## Common Issues & Solutions

### Issue 1: No Contacts
**Log:** `totalContacts=0`
**Fix:** Add contacts in app with types: family, trusted, volunteer, ngo, police

### Issue 2: Twilio Not Configured
**Log:** `❌ [SMS] Twilio client not initialized`
**Fix:** Check `backend/.env` has TWILIO_SID, TWILIO_TOKEN, TWILIO_PHONE

### Issue 3: Invalid Phone Number
**Log:** `errorCode:21211, Invalid 'To' Phone Number`
**Fix:** Use E.164 format: +[country code][number] (e.g., +911234567890)

### Issue 4: Twilio Trial Restrictions
**Log:** `errorCode:21608, number is unverified`
**Fix:** Verify numbers at https://console.twilio.com or upgrade account

### Issue 5: Wrong Contact Types
**Log:** `totalContacts=3, totalTargets=0`
**Fix:** Ensure contacts have valid types (family, trusted, volunteer, ngo, police, emergency)

## Risk Level → SMS Dispatch

| Risk Score | Level | Contacts Alerted |
|------------|-------|------------------|
| 0-30 | LOW | None |
| 31-60 | MEDIUM | family, trusted |
| 61-85 | HIGH | family, trusted, volunteer, ngo |
| 86-100 | VERY HIGH | family, trusted, volunteer, ngo, police, emergency |

**SOS alerts send riskScore: 100 (VERY HIGH) → alerts ALL contact types**

## Files Modified

1. `backend/src/services/coreServices.js` - Added SMS dispatch logging
2. `src/features/emergency/hooks/useSOSAlertSystem.ts` - Added escalation logging
3. `SMS_DEBUG_GUIDE.md` - Complete debugging guide

## Next Steps

1. Test SOS alert
2. Monitor logs in both terminals
3. Identify where SMS dispatch fails
4. Share logs if issue persists

## Quick Checklist

- [ ] Backend running
- [ ] Twilio configured in .env
- [ ] User has contacts added
- [ ] Contacts have valid phone numbers (+country code)
- [ ] Contacts have valid types
- [ ] Trigger SOS
- [ ] Check frontend logs for `[ESCALATE]`
- [ ] Check backend logs for `[SMS]`
- [ ] Verify SMS received

See `SMS_DEBUG_GUIDE.md` for complete details!
