// Test Firestore with REST mode
process.env.FIRESTORE_PREFER_REST = 'true';

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function test() {
  try {
    console.log("Testing Firestore with REST mode...");
    await db.collection("test").doc("ping").set({ time: new Date().toISOString() }, { merge: true });
    console.log("✅ SUCCESS! Firestore is working!");
  } catch (error) {
    console.error("❌ STILL FAILING:", error.message);
  }
  process.exit();
}

test();
