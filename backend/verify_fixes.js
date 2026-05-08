/**
 * SafeHer Backend - Configuration Verification Script
 * 
 * This script checks if all required configurations are properly set up
 * and provides actionable feedback for any issues found.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║     SafeHer Backend Configuration Verification          ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

let issuesFound = 0;
let warningsFound = 0;

// Check 1: Environment Variables
console.log('📋 Checking Environment Variables...');
const requiredEnvVars = [
  'PORT',
  'GEMINI_API_KEY',
  'TWILIO_SID',
  'TWILIO_TOKEN',
  'TWILIO_PHONE',
  'FIREBASE_STORAGE_BUCKET'
];

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}: Set`);
  } else {
    console.log(`   ❌ ${varName}: Missing`);
    issuesFound++;
  }
});

// Check 2: Service Account Key
console.log('\n🔑 Checking Firebase Service Account Key...');
const saPath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(saPath)) {
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    console.log(`   ✅ File exists: serviceAccountKey.json`);
    console.log(`   📝 Project ID: ${serviceAccount.project_id}`);
    
    // Check if project ID matches the expected one
    const expectedProjectId = 'safeher1-514a9';
    if (serviceAccount.project_id !== expectedProjectId) {
      console.log(`   ⚠️  WARNING: Project ID mismatch!`);
      console.log(`      Expected: ${expectedProjectId}`);
      console.log(`      Found: ${serviceAccount.project_id}`);
      console.log(`      This will cause authentication errors!`);
      warningsFound++;
    } else {
      console.log(`   ✅ Project ID matches expected value`);
    }
  } catch (error) {
    console.log(`   ❌ Error reading serviceAccountKey.json: ${error.message}`);
    issuesFound++;
  }
} else {
  console.log(`   ❌ serviceAccountKey.json not found!`);
  console.log(`      Please download it from Firebase Console:`);
  console.log(`      Project Settings → Service Accounts → Generate New Private Key`);
  issuesFound++;
}

// Check 3: Required Directories
console.log('\n📁 Checking Required Directories...');
const requiredDirs = ['uploads', 'logs'];
requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`   ✅ ${dir}/ exists`);
  } else {
    console.log(`   ⚠️  ${dir}/ missing (will be created automatically)`);
    warningsFound++;
  }
});

// Check 4: Firebase Admin SDK
console.log('\n🔥 Testing Firebase Admin SDK...');
try {
  const admin = require('firebase-admin');
  
  if (fs.existsSync(saPath)) {
    const serviceAccount = require('./serviceAccountKey.json');
    
    // Only initialize if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }
    
    const db = admin.firestore();
    const bucket = admin.storage().bucket();
    
    console.log(`   ✅ Firebase Admin SDK initialized`);
    console.log(`   ✅ Firestore connected`);
    console.log(`   ✅ Storage bucket configured: ${bucket.name}`);
    
    // Test bucket existence
    bucket.exists()
      .then(([exists]) => {
        if (exists) {
          console.log(`   ✅ Storage bucket exists and is accessible`);
        } else {
          console.log(`   ⚠️  Storage bucket does not exist!`);
          console.log(`      Please enable Firebase Storage in Firebase Console:`);
          console.log(`      Build → Storage → Get Started`);
          warningsFound++;
        }
        printSummary();
      })
      .catch(error => {
        console.log(`   ⚠️  Could not verify bucket existence: ${error.message}`);
        warningsFound++;
        printSummary();
      });
  } else {
    console.log(`   ⚠️  Skipping Firebase test (serviceAccountKey.json missing)`);
    printSummary();
  }
} catch (error) {
  console.log(`   ❌ Firebase Admin SDK error: ${error.message}`);
  issuesFound++;
  printSummary();
}

function printSummary() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    Verification Summary                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  if (issuesFound === 0 && warningsFound === 0) {
    console.log('\n🎉 All checks passed! Your backend is properly configured.\n');
  } else {
    if (issuesFound > 0) {
      console.log(`\n❌ Critical Issues Found: ${issuesFound}`);
      console.log('   These must be fixed before the backend can work properly.\n');
    }
    if (warningsFound > 0) {
      console.log(`\n⚠️  Warnings: ${warningsFound}`);
      console.log('   These may cause some features to not work correctly.\n');
    }
  }
  
  console.log('📖 For detailed information, see TEST_REPORT.md\n');
  
  // Exit with appropriate code
  process.exit(issuesFound > 0 ? 1 : 0);
}
