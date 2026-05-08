const admin = require('firebase-admin');
const serviceAccount = require('./backend/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function test() {
  try {
    console.log("Attempting to write to Firestore...");
    await db.collection("test").doc("ping").set({ time: new Date() }, { merge: true });
    console.log("SUCCESS!");
  } catch (error) {
    console.error("FIRESTORE ERROR:");
    console.error(error);
  }
}

test();
