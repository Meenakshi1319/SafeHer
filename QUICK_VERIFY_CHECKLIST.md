# Quick Phone Number Verification Checklist ✅

## 🚀 5-Minute Setup

### Step 1: Open Twilio Console
**Link:** https://console.twilio.com/us1/develop/phone-numbers/manage/verified

### Step 2: For Each Contact Number

#### A. Click "Add a new number"
(Red button in top-right)

#### B. Enter phone number
```
Format: +911234567890
        ↑  ↑
        |  |
        |  10-digit number
        |
        Country code (91 for India, 1 for US)
```

**Examples:**
- India: `+919876543210`
- US: `+11234567890`

#### C. Choose "Text Message (SMS)"
(Radio button)

#### D. Click "Send Verification Code"

#### E. Check phone for SMS
(Wait 10-30 seconds)

#### F. Enter 6-digit code
(From the SMS)

#### G. Click "Verify"

#### H. See success message ✅

### Step 3: Repeat for All Contacts

---

## 📱 Which Numbers to Verify?

Get your contact numbers first:
```bash
cd backend
node check-contacts.js YOUR_USER_ID
```

Then verify each number shown.

---

## 🧪 Test After Verification

```bash
cd backend
node send-test-sms.js +911234567890
```

Should see:
```
✅ SMS sent successfully!
```

Check phone for test message.

---

## ✅ Done!

Now trigger SOS in app and SMS will be sent! 🎉

---

## 💳 Too Many Numbers?

**Upgrade to paid account instead:**
1. Go to: https://console.twilio.com/billing
2. Upgrade account
3. Add $20 credit
4. Send to ANY number (no verification needed)

---

## 🆘 Problems?

See full guide: `VERIFY_PHONE_NUMBERS_GUIDE.md`
