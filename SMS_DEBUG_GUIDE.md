# SMS Dispatch Debugging Guide

## Problem
SMS is not being sent to trusted contacts when SOS is triggered.

## Changes Made

### Backend Logging (coreServices.js)

Added comprehensive logging with `[SMS]` and `[EMERGENCY]` prefixes:

1. **triggerEmergency Function**
   - Logs when emergency is triggered
   - Logs risk level calculation
   - Logs Firestore save
   - Logs dispatch call
   - Logs completion

2. **dispatchByRiskLevel Function**
   - Logs function call with parameters
   - Logs total contacts fetched
   - Logs contact types
   - Logs allowed types for risk level
   - Logs filtered target contacts
   - Logs SMS message preparation
   - Logs SMS sending results

3. **sendSMS Function**
   - Logs SMS attempt
   - Logs Twilio client status
   - Logs Twilio phone number
   - Logs sending via Twilio
   - Logs success with SID
   - Logs detailed errors

### Frontend Logging (useSOSAlertSystem.ts)

Added comprehensive logging with `[ESCALATE]` prefix:

- Logs escalation start
- Logs user ID
- Logs location permission and retrieval
- Logs contacts fetch
- Logs emergency contacts filtering
- Logs SOS trigger payload
- Logs SOS response
- Logs completion

## How SMS Dispatch Works

### Flow Diagram

```
User triggers SOS
       ↓
Frontend: escalateToContacts()
       ↓
Frontend: apiPost('/trigger-sos', { uid, reason, riskScore: 100, location })
       ↓
Backend: POST /trigger-sos
       ↓
Backend: triggerEmergency(uid, reason, score, location, io)
       ↓
Backend: dispatchByRiskLevel(uid, riskLevel, reason, score, location)
       ↓
Backend: getContacts(uid) → Fetch from Firestore
       ↓
Backend: filterContactsByType(contacts, allowedTypes)
       ↓
Backend: sendSMS(phone, message) for each contact
       ↓
Twilio: Send SMS
```

### Risk Level → Contact Types Mapping

| Risk Level | Score Range | Contact Types Alerted |
|------------|-------------|----------------------|
| LOW        | 0-30        | None (no SMS sent) |
| MEDIUM     | 31-60       | family, trusted |
| HIGH       | 61-85       | family, trusted, volunteer, ngo |
| VERY HIGH  | 86-100      | family, trusted, volunteer, ngo, police, emergency |

**Important:** SOS alerts from the app send `riskScore: 100`, which is **VERY HIGH**, so it should alert ALL contact types.

## Testing Steps

### 1. Start Backend Server
```bash
cd backend
npm start
```

### 2. Trigger SOS Alert
- Tap SOS button
- Wait or click "I AM SAFE"/"I AM NOT SAFE"

### 3. Monitor Logs

#### Frontend Logs (Metro Bundler)

Look for `[ESCALATE]` logs:

```
🚨 [ESCALATE] Starting escalation...
👤 [ESCALATE] User ID: abc123
📍 [ESCALATE] Requesting location permission...
📍 [ESCALATE] Location permission status: granted
📍 [ESCALATE] Getting current position...
📍 [ESCALATE] Location obtained: {latitude: X, longitude: Y}
📋 [ESCALATE] Fetching contacts...
📋 [ESCALATE] Contacts response: {"success":true,"contacts":[...]}
📋 [ESCALATE] Total contacts: 3
👥 [ESCALATE] Emergency contacts: 2
👥 [ESCALATE] Contact details: [{name:"Mom",type:"family",phone:"+1234567890"}]
📤 [ESCALATE] Sending trigger-sos request...
📤 [ESCALATE] SOS payload: {"uid":"abc","reason":"...","riskScore":100}
📥 [ESCALATE] SOS response: {"success":true,...}
✅ [ESCALATE] Escalation complete
```

#### Backend Logs (Terminal)

Look for `[EMERGENCY]` and `[SMS]` logs:

```json
{"tag":"INFO","message":"🚨 [EMERGENCY] triggerEmergency called","uid":"abc","reason":"...","score":100}
{"tag":"INFO","message":"📊 [EMERGENCY] Risk level calculated","score":100,"riskLevel":"VERY HIGH"}
{"tag":"INFO","message":"💾 [EMERGENCY] Global alert saved to Firestore"}
{"tag":"INFO","message":"📤 [EMERGENCY] Calling dispatchByRiskLevel..."}
{"tag":"INFO","message":"📤 [SMS] dispatchByRiskLevel called","riskLevel":"VERY HIGH","score":100}
{"tag":"INFO","message":"📋 [SMS] Fetched contacts","totalContacts":3,"contactTypes":["family","trusted","volunteer"]}
{"tag":"INFO","message":"🎯 [SMS] Allowed contact types for risk level","riskLevel":"VERY HIGH","allowedTypes":["family","trusted","volunteer","ngo","police","emergency"]}
{"tag":"INFO","message":"👥 [SMS] Filtered target contacts","totalTargets":2,"targetNames":["Mom","Friend"],"targetPhones":["+1234567890","+0987654321"]}
{"tag":"INFO","message":"📝 [SMS] SMS message prepared","messageLength":150,"stealthMode":false}
{"tag":"INFO","message":"📤 [SMS] Sending SMS to targets...","count":2}
{"tag":"INFO","message":"📱 [SMS] Attempting to send SMS","to":"+1234567890"}
{"tag":"INFO","message":"📤 [SMS] Sending via Twilio","from":"+1XXXXXXXXXX","to":"+1234567890"}
{"tag":"SMS","message":"✅ Sent to +1234567890"}
{"tag":"INFO","message":"✅ [SMS] SMS sent successfully","to":"+1234567890","sid":"SM...","status":"queued"}
{"tag":"INFO","message":"✅ [SMS] SMS dispatch complete","total":2,"successful":2,"failed":0}
```

## Common Issues

### Issue 1: No Contacts Found

**Symptoms:**
```json
{"tag":"WARN","message":"⚠️ [SMS] No contacts of types [...] found for uid"}
```

**Causes:**
- User has no contacts added
- Contacts don't have the right type (family, trusted, etc.)
- Firestore query failing

**Debug:**
```
📋 [SMS] Fetched contacts: totalContacts=0
```

**Fix:**
1. Check Firestore: `users/{uid}/contacts`
2. Verify contacts have correct `type` field
3. Add contacts via app

### Issue 2: Twilio Not Initialized

**Symptoms:**
```json
{"tag":"ERROR","message":"❌ [SMS] Twilio client not initialized"}
```

**Causes:**
- Missing TWILIO_SID or TWILIO_TOKEN in .env
- Invalid Twilio credentials

**Fix:**
1. Check `backend/.env`:
   ```
   TWILIO_SID=ACxxxxx
   TWILIO_TOKEN=xxxxx
   TWILIO_PHONE=+1234567890
   ```
2. Verify credentials at https://console.twilio.com
3. Restart backend server

### Issue 3: Invalid Phone Number

**Symptoms:**
```json
{"tag":"ERROR","message":"❌ [SMS] Detailed error","errorCode":21211,"errorMessage":"Invalid 'To' Phone Number"}
```

**Causes:**
- Phone number not in E.164 format (+[country code][number])
- Phone number missing country code
- Invalid phone number

**Fix:**
1. Check contact phone numbers in Firestore
2. Ensure format: `+91XXXXXXXXXX` (India) or `+1XXXXXXXXXX` (US)
3. Update contacts with correct format

### Issue 4: Twilio Trial Account Restrictions

**Symptoms:**
```json
{"tag":"ERROR","message":"❌ [SMS] Detailed error","errorCode":21608,"errorMessage":"The number +XXXX is unverified"}
```

**Causes:**
- Using Twilio trial account
- Recipient number not verified in Twilio

**Fix:**
1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Add and verify recipient phone numbers
3. OR upgrade to paid Twilio account

### Issue 5: Low Risk Score

**Symptoms:**
```json
{"tag":"INFO","message":"⚠️ [SMS] Risk level is LOW - no SMS dispatch"}
```

**Causes:**
- Risk score < 31
- SMS only sent for MEDIUM, HIGH, VERY HIGH

**Fix:**
- SOS alerts should send riskScore: 100
- Check frontend payload: `riskScore: 100`

### Issue 6: Wrong Contact Types

**Symptoms:**
```
📋 [SMS] Fetched contacts: totalContacts=3
👥 [SMS] Filtered target contacts: totalTargets=0
```

**Causes:**
- Contacts have wrong type (e.g., "friend" instead of "trusted")
- Contact type doesn't match allowed types

**Fix:**
1. Check contact types in Firestore
2. Valid types: family, trusted, volunteer, ngo, police, emergency
3. Update contact types

## Testing Checklist

### Pre-Testing
- [ ] Backend server running
- [ ] Twilio credentials configured in .env
- [ ] User has contacts added
- [ ] Contacts have valid phone numbers (+[country][number])
- [ ] Contacts have valid types (family, trusted, etc.)

### During Testing
- [ ] Trigger SOS alert
- [ ] See `[ESCALATE]` logs in frontend
- [ ] See `[EMERGENCY]` logs in backend
- [ ] See `[SMS]` logs in backend
- [ ] See "Fetched contacts" with count > 0
- [ ] See "Filtered target contacts" with count > 0
- [ ] See "Attempting to send SMS" for each contact
- [ ] See "SMS sent successfully" for each contact
- [ ] Receive SMS on phone

### Verification
- [ ] Check phone for SMS
- [ ] SMS contains risk level
- [ ] SMS contains reason
- [ ] SMS contains location link
- [ ] SMS has correct format

## SMS Message Format

### Normal Mode
```
🔴 SAFEHER ALERT
Risk Level : VERY HIGH (100/100)
Reason     : User did not respond to safety check - EMERGENCY
Location   : https://www.google.com/maps?q=17.385,78.487
Please respond immediately!
```

### Stealth Mode
```
🤫 SAFEHER STEALTH ALERT
User is in a decoy mode. DO NOT call them back! Monitor silently.
Risk: VERY HIGH (100/100)
Loc: https://www.google.com/maps?q=17.385,78.487
```

## Twilio Configuration

### Required Environment Variables
```bash
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE=+1234567890
```

### Verify Twilio Setup
```bash
# Test Twilio credentials
curl -X POST https://api.twilio.com/2010-04-01/Accounts/$TWILIO_SID/Messages.json \
  --data-urlencode "Body=Test message" \
  --data-urlencode "From=$TWILIO_PHONE" \
  --data-urlencode "To=+1234567890" \
  -u $TWILIO_SID:$TWILIO_TOKEN
```

## Contact Format in Firestore

### Collection Path
```
users/{uid}/contacts/{contactId}
```

### Document Structure
```json
{
  "name": "Mom",
  "phone": "+911234567890",
  "type": "family",
  "createdAt": "2026-05-11T00:00:00.000Z"
}
```

### Valid Contact Types
- `family` - Family members
- `trusted` - Trusted friends
- `volunteer` - Nearby volunteers
- `ngo` - NGO contacts
- `police` - Police contacts
- `emergency` - Emergency services

## Next Steps

1. **Test with logs enabled**
2. **Check each log point**
3. **Identify where flow breaks**
4. **Share complete logs if issue persists**

## Log Patterns

### Successful SMS Flow
```
Frontend: 🚨 [ESCALATE] Starting escalation...
Frontend: 👥 [ESCALATE] Emergency contacts: 2
Frontend: 📤 [ESCALATE] Sending trigger-sos request...
Backend:  🚨 [EMERGENCY] triggerEmergency called
Backend:  📤 [SMS] dispatchByRiskLevel called
Backend:  📋 [SMS] Fetched contacts: totalContacts=3
Backend:  👥 [SMS] Filtered target contacts: totalTargets=2
Backend:  📱 [SMS] Attempting to send SMS
Backend:  ✅ [SMS] SMS sent successfully
Backend:  ✅ [SMS] SMS dispatch complete: successful=2, failed=0
```

### Failed SMS Flow - No Contacts
```
Frontend: 🚨 [ESCALATE] Starting escalation...
Frontend: 👥 [ESCALATE] Emergency contacts: 0
Frontend: 📤 [ESCALATE] Sending trigger-sos request...
Backend:  🚨 [EMERGENCY] triggerEmergency called
Backend:  📤 [SMS] dispatchByRiskLevel called
Backend:  📋 [SMS] Fetched contacts: totalContacts=0
Backend:  ⚠️ [SMS] No contacts of types [...] found
```

### Failed SMS Flow - Twilio Error
```
Frontend: 🚨 [ESCALATE] Starting escalation...
Frontend: 👥 [ESCALATE] Emergency contacts: 2
Backend:  📱 [SMS] Attempting to send SMS
Backend:  ❌ [SMS] Twilio client not initialized
Backend:  ❌ SMS failed to +1234567890
```

Test and share the logs!
