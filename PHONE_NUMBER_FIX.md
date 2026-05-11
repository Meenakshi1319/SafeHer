# Phone Number Format Fix

## 🔍 Problem Found!

Your contact phone number is: `9502381087`

This is **MISSING**:
- ❌ The `+` sign
- ❌ The country code `91` (India)

**Should be:** `+919502381087`

## 📋 From Your Logs

```
Contact details: [
  {"name": "Kart", "phone": "9502381087", "type": "trusted"},
  {"name": "Kart", "phone": "9502381087", "type": "trusted"}
]
```

Twilio requires **E.164 format**: `+[country code][number]`

## 🔧 How to Fix

### Option 1: Use Fix Script (Fastest) ⚡

```bash
cd backend
node fix-phone-numbers.js opfXGBBZ4POUX4E99UXbVm1HvpL2 91
```

This will automatically add `+91` to all phone numbers.

### Option 2: Update in App

1. Open SafeHer app
2. Go to **Contacts** tab
3. Edit contact "Kart"
4. Change phone: `9502381087` → `+919502381087`
5. Save

### Option 3: Update in Firebase Console

1. Go to: https://console.firebase.google.com
2. Navigate to **Firestore Database**
3. Path: `users/opfXGBBZ4POUX4E99UXbVm1HvpL2/contacts`
4. Edit both contact documents
5. Change `phone` field to: `+919502381087`
6. Save

## ✅ After Fixing

### Step 1: Verify Number in Twilio

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Click "Add a new number"
3. Enter: `+919502381087`
4. Choose "Text Message (SMS)"
5. Enter verification code from SMS
6. Done!

### Step 2: Test SMS

```bash
cd backend
node send-test-sms.js +919502381087
```

Expected output:
```
✅ SMS sent successfully!
```

Check phone for test SMS.

### Step 3: Test SOS in App

1. Open SafeHer app
2. Trigger SOS alert
3. Check backend logs for:
   ```json
   {"tag":"INFO","message":"✅ [SMS] SMS sent successfully"}
   ```
4. Check phone for SMS

## 📊 Why This Happened

When adding contacts in the app, the phone number was saved without the country code.

**Common formats that DON'T work:**
- ❌ `9502381087` (no country code)
- ❌ `919502381087` (no + sign)
- ❌ `+91 9502381087` (has space)
- ❌ `+91-9502381087` (has dash)

**Correct format:**
- ✅ `+919502381087`

## 🔄 Prevent Future Issues

When adding contacts in the app, always use format:
- India: `+91XXXXXXXXXX`
- US: `+1XXXXXXXXXX`

## 📝 Summary

**Current:** `9502381087`  
**Fixed:** `+919502381087`  
**Action:** Run fix script OR update manually  
**Then:** Verify in Twilio + Test SMS  
**Result:** SMS will work! 🎉
