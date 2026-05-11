/**
 * Cleanup Invalid Recordings Script
 * 
 * This script removes recordings with invalid file paths (e.g., /videos/...)
 * Run: node cleanup-invalid-recordings.js <uid>
 */

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const saPath = path.join(__dirname, 'src', 'serviceAccountKey.json');
if (!fs.existsSync(saPath)) {
  console.log('❌ serviceAccountKey.json not found!');
  process.exit(1);
}

const serviceAccount = require(saPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Get UID from command line
const uid = process.argv[2];

if (!uid) {
  console.log('\n❌ Please provide a user ID');
  console.log('Usage: node cleanup-invalid-recordings.js <uid>\n');
  console.log('Example: node cleanup-invalid-recordings.js opfXGBBZ4POUX4E99UXbVm1HvpL2\n');
  process.exit(1);
}

console.log('\n🧹 Cleaning up invalid recordings for user:', uid);
console.log('─'.repeat(60));

async function cleanupInvalidRecordings() {
  try {
    // Fetch recordings
    const recordingsSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('recordings')
      .get();

    if (recordingsSnapshot.empty) {
      console.log('\n⚠️  No recordings found for this user\n');
      process.exit(0);
    }

    console.log(`\n✅ Found ${recordingsSnapshot.size} recording(s)\n`);

    let deleted = 0;
    let kept = 0;
    let errors = 0;

    for (const doc of recordingsSnapshot.docs) {
      const recording = doc.data();
      const recordingId = doc.id;
      const fileUrl = recording.fileUrl;

      console.log(`\n📋 Recording: ${recording.fileName || 'Unnamed'}`);
      console.log(`   ID: ${recordingId}`);
      console.log(`   File URL: ${fileUrl || 'Not set'}`);
      console.log(`   Created: ${recording.createdAt?.toDate?.() || 'Unknown'}`);

      // Check if file URL is invalid
      const isInvalid = !fileUrl || 
                       fileUrl.startsWith('/videos/') || 
                       (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://'));

      if (isInvalid) {
        console.log('   ❌ Invalid file URL - deleting...');

        try {
          await db
            .collection('users')
            .doc(uid)
            .collection('recordings')
            .doc(recordingId)
            .delete();

          console.log('   ✅ Deleted successfully');
          deleted++;
        } catch (error) {
          console.log('   ❌ Delete failed:', error.message);
          errors++;
        }
      } else {
        console.log('   ✅ Valid file URL - keeping');
        kept++;
      }
    }

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log('📊 Summary:');
    console.log('─'.repeat(60));
    console.log(`Total recordings: ${recordingsSnapshot.size}`);
    console.log(`Deleted (invalid): ${deleted}`);
    console.log(`Kept (valid): ${kept}`);
    console.log(`Errors: ${errors}`);

    if (deleted > 0) {
      console.log('\n✅ Cleanup complete! Invalid recordings removed.');
      console.log('\n💡 Next steps:');
      console.log('   1. Trigger a new SOS alert in the app');
      console.log('   2. New recordings will have valid URLs');
      console.log('   3. Audio playback should work correctly\n');
    } else if (kept > 0) {
      console.log('\n✅ All recordings have valid URLs!\n');
    } else {
      console.log('\n⚠️  No recordings to process\n');
    }

    process.exit(0);

  } catch (error) {
    console.log('\n❌ Error:', error.message);
    console.log('\nFull error:', error);
    process.exit(1);
  }
}

cleanupInvalidRecordings();
