const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const fs = require('fs');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'safeher1-514a9.appspot.com'
});

const bucket = admin.storage().bucket();

async function testStorage() {
  console.log(`Checking bucket: ${bucket.name}`);
  try {
    const [exists] = await bucket.exists();
    if (exists) {
      console.log('✅ Bucket exists!');
      
      // Try to upload a tiny file
      fs.writeFileSync('dummy.txt', 'Hello Firebase Storage!');
      await bucket.upload('dummy.txt', { destination: 'test/dummy.txt' });
      console.log('✅ Upload successful!');
      
      fs.unlinkSync('dummy.txt');
    } else {
      console.log('❌ Bucket DOES NOT exist according to API.');
    }
  } catch (err) {
    console.error('❌ Error checking/uploading:', err.message);
  }
}

testStorage();
