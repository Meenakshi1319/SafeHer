# Delete Evidence Feature

## ✨ New Feature Added

Users can now **delete evidence recordings** from the Evidence Vault!

---

## 🎯 How to Use

### Method 1: Via Options Menu (Recommended)

1. Open **Evidence Vault** on home screen
2. **Tap any recording** to open options menu
3. Select **🗑️ Delete**
4. Confirm deletion
5. Recording is deleted ✅

### Method 2: Via Long Press (Future)

Currently not implemented, but can be added if needed.

---

## 🔧 What Gets Deleted

When you delete a recording, the system removes:

### 1. Database Entry ✅
- Deleted from Firestore: `users/{uid}/recordings/{recordingId}`
- Metadata removed (filename, hash, date, etc.)

### 2. Firebase Storage File ✅
- If file is stored in Firebase Storage
- URL format: `https://storage.googleapis.com/...`
- File permanently deleted from cloud

### 3. Local Storage File ✅
- If file is stored locally on backend
- URL format: `http://backend:5000/uploads/evidence/...`
- File deleted from `backend/uploads/evidence/`

### 4. UI Update ✅
- Recording removed from Evidence Vault immediately
- No need to refresh

---

## 🛡️ Safety Features

### Confirmation Dialog
Before deletion, user sees:
```
🗑️ Delete Evidence

Are you sure you want to delete this recording?

Audio Recording
May 11, 2026, 2:00 PM

This action cannot be undone.

[Cancel] [Delete]
```

### Playback Stop
- If recording is currently playing, playback stops automatically
- Prevents errors from deleting a file that's in use

### Error Handling
- If deletion fails, user sees error message
- Recording remains in vault if deletion fails
- Partial failures are logged but don't block the operation

---

## 📱 User Interface

### Options Menu
When tapping a recording, users see:
```
Evidence Options

▶️ Play Audio          (for audio files)
📂 Open File           (if file URL available)
📋 Details             (shows file info)
🔐 View Hash           (shows blockchain hash)
🗑️ Delete              (deletes recording) ← NEW!
Cancel
```

### Delete Button Style
- Red text (destructive style)
- Positioned near bottom of menu
- Clear warning icon 🗑️

---

## 🔍 Technical Details

### Frontend Changes

**File:** `app/(tabs)/index.tsx`

**New Function:** `handleDeleteEvidence()`
```typescript
const handleDeleteEvidence = useCallback(async (recording: any) => {
  // Show confirmation dialog
  // Stop playback if playing
  // Call DELETE API
  // Update local state
  // Show success/error message
}, [playingAudio]);
```

**Updated Function:** `handleEvidenceOptions()`
- Added delete option to menu
- Styled as destructive action

### Backend Changes

**File:** `backend/src/api/controllers/recordingController.js`

**New Endpoint:** `DELETE /recording/:uid/:recordingId`

**What it does:**
1. Validates user authentication
2. Fetches recording details
3. Deletes from Firestore
4. Deletes from Firebase Storage (if applicable)
5. Deletes from local storage (if applicable)
6. Emits socket event
7. Returns success response

**Response:**
```json
{
  "success": true,
  "message": "Recording deleted successfully",
  "recordingId": "abc123",
  "fileName": "recording.m4a"
}
```

---

## 🧪 Testing

### Test Delete Flow

1. **Create a recording:**
   ```
   - Trigger SOS alert
   - Wait for evidence upload
   - Verify recording appears in vault
   ```

2. **Delete the recording:**
   ```
   - Tap recording in vault
   - Select "🗑️ Delete"
   - Confirm deletion
   - Verify recording disappears
   ```

3. **Verify deletion:**
   ```
   - Check Firestore (recording should be gone)
   - Check Firebase Storage (file should be gone)
   - Check local storage (file should be gone)
   - Refresh vault (recording should not reappear)
   ```

### Test Edge Cases

**Test 1: Delete while playing**
- Start playing a recording
- Delete it while playing
- Playback should stop
- Recording should be deleted

**Test 2: Delete with network error**
- Turn off network
- Try to delete
- Should show error message
- Recording should remain in vault

**Test 3: Delete non-existent file**
- Delete recording where file doesn't exist
- Should still delete database entry
- Should show success (file already gone)

---

## 📊 Logging

### Frontend Logs
```
🗑️ [DELETE] Deleting recording: abc123
✅ [DELETE] Recording deleted successfully
```

Or on error:
```
❌ [DELETE] Delete failed: [error message]
❌ [DELETE] Error deleting recording: [error]
```

### Backend Logs
```
🗑️ [DELETE] Delete recording request
📋 [DELETE] Recording details
✅ [DELETE] Deleted from Firestore
✅ [DELETE] Deleted from Firebase Storage
✅ [DELETE] Deleted from local storage
✅ [DELETE] Recording deleted successfully
```

Or on error:
```
❌ [DELETE] Database not connected
⚠️ [DELETE] Recording not found
⚠️ [DELETE] Firebase Storage delete failed
⚠️ [DELETE] Local file delete failed
❌ [DELETE] Delete recording failed
```

---

## 🔒 Security

### Authentication Required
- User must be logged in
- User can only delete their own recordings
- Admin can delete any recording

### Authorization Check
```javascript
requireAuth, requireSelfOrAdmin
```

### Token Validation
- JWT token required in Authorization header
- Token validated before deletion

---

## 🎨 UI/UX Considerations

### Why Delete?
Users may want to delete recordings for:
- Privacy reasons
- Storage management
- Removing test recordings
- Cleaning up old evidence

### Confirmation Required
- Prevents accidental deletion
- Shows recording details
- Clear warning about permanence

### Immediate Feedback
- Recording disappears immediately
- Success message shown
- No need to refresh

### Error Handling
- Clear error messages
- Recording remains if deletion fails
- User can retry

---

## 🚀 Future Enhancements

### Possible Improvements:

1. **Bulk Delete**
   - Select multiple recordings
   - Delete all at once

2. **Soft Delete**
   - Move to "Trash" folder
   - Permanent delete after 30 days
   - Restore option

3. **Delete Confirmation Setting**
   - Option to skip confirmation
   - For advanced users

4. **Storage Stats**
   - Show total storage used
   - Show space freed after deletion

5. **Export Before Delete**
   - Option to export before deleting
   - Save to device or cloud

---

## 📝 API Documentation

### DELETE /recording/:uid/:recordingId

**Description:** Delete an evidence recording

**Authentication:** Required (JWT token)

**Authorization:** User must own the recording or be admin

**Parameters:**
- `uid` (path) - User ID
- `recordingId` (path) - Recording ID

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Recording deleted successfully",
  "recordingId": "abc123",
  "fileName": "recording.m4a"
}
```

**Error Responses:**

**404 - Not Found:**
```json
{
  "success": false,
  "message": "Recording not found"
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "message": "DB not connected"
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

---

## ✅ Completion Checklist

- [x] Frontend delete function implemented
- [x] Backend DELETE endpoint created
- [x] Confirmation dialog added
- [x] Playback stop on delete
- [x] Firestore deletion
- [x] Firebase Storage deletion
- [x] Local storage deletion
- [x] Socket event emission
- [x] Error handling
- [x] Logging added
- [x] UI updated
- [ ] User testing (pending)
- [ ] Documentation complete

---

## 🎉 Summary

**Feature:** Delete evidence recordings from Evidence Vault

**Status:** ✅ COMPLETE

**How to use:** Tap recording → Select "🗑️ Delete" → Confirm

**What gets deleted:**
- ✅ Database entry
- ✅ Firebase Storage file
- ✅ Local storage file
- ✅ UI display

**Safety:**
- ✅ Confirmation required
- ✅ Playback stops automatically
- ✅ Error handling
- ✅ Authentication required

**Ready for testing!** 🚀

---

## 📞 Support

If you encounter issues:

1. **Check logs** for [DELETE] messages
2. **Verify authentication** (logged in)
3. **Check network** connection
4. **Try again** if it fails

**The delete feature is now live and ready to use!** 🎉
