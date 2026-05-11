/**
 * Delete a specific recording by ID
 */

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const saPath = path.join(__dirname, 'src', 'serviceAccountKey.json');
const serviceAccount = require(saPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const uid = 'opfXGBBZ4POUX4E99UXbVm1HvpL2';
const recordingId = 'UiN1rdaLrmDegirNoYis';

async function deleteRecording() {
  try {
    await db.collection('users').doc(uid).collection('recordings').doc(recordingId).delete();
    console.log('✅ Recording deleted successfully');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  process.exit(0);
}

deleteRecording();
