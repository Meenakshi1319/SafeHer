# Urgent Bug Fixes Applied

## Date: May 11, 2026

### ✅ Fix #1: Hardcoded Emergency Number (CRITICAL)

**Problem:**
- SMS fallback in offline mode was hardcoded to send to '911' (US emergency number)
- App targets India, where emergency numbers are different (100 for police, 112 for general emergency)
- Should send to user's actual trusted contacts instead

**Solution:**
- Modified `src/features/emergency/hooks/useSOSAction.ts`
- Now fetches emergency contacts from backend using `/contacts/:uid` API
- Filters for 'family' and 'trusted' contact types (highest priority)
- Sends SMS to all priority contacts instead of hardcoded number
- Added proper error handling if no contacts are found
- Shows user-friendly messages about contact count

**Files Changed:**
- `src/features/emergency/hooks/useSOSAction.ts` (lines 108-130)

---

### ✅ Fix #2: Exposed Firebase Credentials (CRITICAL SECURITY)

**Problem:**
- Firebase API keys and configuration were hardcoded in source code
- Visible in version control and client bundles
- Security risk - credentials exposed to anyone with access to the code

**Solution:**
- Moved all Firebase config to environment variables
- Updated `src/core/firebase/index.ts` to load from `process.env.EXPO_PUBLIC_*`
- Added validation to check if required config is present
- Updated `.env.local` with actual credentials (gitignored)
- Updated `.env.local.example` with placeholder values for other developers

**Environment Variables Added:**
```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
```

**Files Changed:**
- `src/core/firebase/index.ts` (lines 14-32)
- `.env.local` (added Firebase config)
- `.env.local.example` (added Firebase placeholders)

---

## Testing Required

### For Fix #1 (Emergency Contacts):
1. Add at least 2 emergency contacts in the Contacts tab
2. Turn off WiFi/mobile data to simulate offline mode
3. Trigger SOS button
4. Verify SMS is sent to your emergency contacts (not to 911)
5. Check that status message shows correct contact count

### For Fix #2 (Firebase Security):
1. Restart the Expo development server
2. Verify app still connects to Firebase
3. Check that authentication still works
4. Verify that no Firebase credentials appear in source code
5. Confirm `.env.local` is in `.gitignore`

---

## Remaining Issues (21 bugs identified)

See the full bug analysis for details on:
- 2 High severity issues (race conditions, error handling)
- 11 Medium severity issues (validation, timeouts, rate limiting)
- 7 Low severity issues (type safety, cleanup, minor logic errors)

These can be addressed tomorrow as planned.

---

## Notes

- Both fixes are backward compatible
- No breaking changes to API contracts
- Offline SMS fallback now requires users to have emergency contacts configured
- Firebase config validation will log errors if environment variables are missing
