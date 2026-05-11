# Twilio Trial Account - SMS Fix Guide

## ✅ Good News
Your Twilio configuration is **CORRECT** and **WORKING**!

```
✅ Credentials are valid
✅ Twilio client is working  
✅ Account is active
✅ Phone number verified
✅ SMS capability enabled
```

## ⚠️ The Problem
Your Twilio account is a **TRIAL account**, which has restrictions:

**Trial Account Restriction:**
- Can ONLY send SMS to **verified phone numbers**
- Cannot send SMS to unverified numbers
- This is a Twilio security feature to prevent spam

## 🔍 Check Your Contacts

Run this command to check your contacts:

```bash
cd backend
node check-contacts.js YOUR_USER_ID
```

This will show:
- All your contacts
- Which have valid phone numbers
- Which are eligible for SMS
- Which numbers need verification

## 🔧 Solution Options

### Option 1: Verify Phone Numbers (Free)

**Step 1: Get your contacts' phone numbers**
```bash
cd backend
node check-contacts.js YOUR_USER_ID
```

**Step 2: Verify each number in Twilio Console**
1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Click "Add a new number"
3. Enter the phone number (with country code)
4. Choose verification method (SMS or Call)
5. Enter the verification code
6. Repeat for each contact

**Step 3: Test SMS**
After verifying numbers, trigger SOS and check if SMS is sent.

### Option 2: Upgrade to Paid Account (Recommended)

**Benefits:**
- Send SMS to ANY phone number
- No verification required
- Higher sending limits
- Better for production use

**Steps:**
1. Go to: https://console.twilio.com/billing
2. Click "Upgrade your account"
3. Add payment method
4. Add funds (minimum $20)
5. SMS will work immediately for all numbers

**Cost:**
- SMS: ~$0.0075 per message (India)
- SMS: ~$0.0079 per message (US)
- Very affordable for emergency alerts

### Option 3: Use Alternative SMS Service

If you don't want to upgrade Twilio, you can use:

**India-specific services:**
- MSG91 (https://msg91.com)
- Twilio India (paid account)
- AWS SNS
- Firebase Cloud Messaging

**Global services:**
- Twilio (paid)
- AWS SNS
- Vonage (Nexmo)
- Plivo

## 📱 How to Verify Numbers (Detailed)

### For Indian Numbers (+91)

1. **Go to Twilio Console:**
   https://console.twilio.com/us1/develop/phone-numbers/manage/verified

2. **Click "Add a new number"**

3. **Enter number:**
   ```
   +911234567890
   ```
   (Replace with actual contact number)

4. **Choose verification method:**
   - SMS (recommended)
   - Voice call

5. **Enter verification code:**
   - Code will be sent to the phone
   - Enter the 6-digit code
   - Click "Verify"

6. **Repeat for each contact:**
   - Family members
   - Trusted contacts
   - Volunteers
   - Police contacts
   - NGO contacts

### For US Numbers (+1)

Same process, but use format:
```
+11234567890
```

## 🧪 Testing After Verification

### Step 1: Verify numbers are added
Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified

You should see all your contacts' numbers listed.

### Step 2: Check contacts in database
```bash
cd backend
node check-contacts.js YOUR_USER_ID
```

### Step 3: Trigger SOS alert
1. Open SafeHer app
2. Tap SOS button
3. Wait or click "I AM SAFE"/"I AM NOT SAFE"

### Step 4: Check logs
**Backend logs should show:**
```json
{"tag":"INFO","message":"📤 [SMS] Sending SMS to targets...","count":2}
{"tag":"INFO","message":"📱 [SMS] Attempting to send SMS","to":"+911234567890"}
{"tag":"INFO","message":"✅ [SMS] SMS sent successfully","sid":"SM..."}
```

**If you see error:**
```json
{"tag":"ERROR","message":"❌ [SMS] Detailed error","errorCode":21608}
```
This means the number is still not verified.

### Step 5: Check phone
Contacts should receive SMS like:
```
🔴 SAFEHER ALERT
Risk Level : VERY HIGH (100/100)
Reason     : User did not respond to safety check - EMERGENCY
Location   : https://www.google.com/maps?q=17.385,78.487
Please respond immediately!
```

## 📊 Quick Comparison

| Feature | Trial Account | Paid Account |
|---------|---------------|--------------|
| Cost | Free | ~$0.008/SMS |
| Verified numbers only | ✅ Yes | ❌ No |
| Any number | ❌ No | ✅ Yes |
| Sending limits | Low | High |
| Production ready | ❌ No | ✅ Yes |

## 🎯 Recommended Approach

**For Testing:**
1. Verify 2-3 phone numbers (yours + family)
2. Test SMS functionality
3. Verify everything works

**For Production:**
1. Upgrade to paid Twilio account
2. Add $20-50 credit
3. Deploy without restrictions

## 🔍 Troubleshooting

### Issue: "Number is unverified" error

**Error code:** 21608

**Solution:**
1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Verify the phone number
3. Try again

### Issue: "Invalid phone number" error

**Error code:** 21211

**Solution:**
1. Check phone number format: +[country code][number]
2. India: +911234567890
3. US: +11234567890
4. Update contact in app

### Issue: SMS not received

**Possible causes:**
1. Number not verified (trial account)
2. Invalid phone number format
3. Phone has SMS blocked
4. Network issues

**Solution:**
1. Check Twilio logs: https://console.twilio.com/us1/monitor/logs/sms
2. Verify number format
3. Check phone settings
4. Try different number

## 📝 Summary

**Current Status:**
- ✅ Twilio is configured correctly
- ✅ Credentials are valid
- ⚠️ Trial account restrictions apply

**To Fix:**
1. **Quick fix:** Verify phone numbers in Twilio Console
2. **Best fix:** Upgrade to paid account ($20 minimum)

**After Fix:**
- SMS will be sent to all emergency contacts
- No more "unverified number" errors
- Production-ready SMS alerts

## 🆘 Need Help?

1. **Check contacts:**
   ```bash
   cd backend
   node check-contacts.js YOUR_USER_ID
   ```

2. **Test Twilio:**
   ```bash
   cd backend
   node test-twilio.js
   ```

3. **Check Twilio logs:**
   https://console.twilio.com/us1/monitor/logs/sms

4. **Verify numbers:**
   https://console.twilio.com/us1/develop/phone-numbers/manage/verified

5. **Upgrade account:**
   https://console.twilio.com/billing

## 🎉 Next Steps

1. ✅ Twilio is working - no code changes needed!
2. 🔧 Verify phone numbers OR upgrade account
3. 🧪 Test SMS sending
4. ✅ Deploy with confidence!
