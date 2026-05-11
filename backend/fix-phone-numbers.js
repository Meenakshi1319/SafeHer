/**
 * Fix Phone Numbers Script
 * 
 * This script adds country code to phone numbers missing it.
 * Run: node fix-phone-numbers.js <uid> <country_code>
 * 
 * Example: node fix-phone-numbers.js opfXGBBZ4POUX4E99UXbVm1HvpL2 91
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

// Get UID and country code from command line
const uid = process.argv[2];
const countryCode = process.argv[3] || '91'; // Default to India

if (!uid) {
  console.log('\n❌ Please provide a user ID');
  console.log('Usage: node fix-phone-numbers.js <uid> [country_code]\n');
  console.log('Examples:');
  console.log('  India: node fix-phone-numbers.js abc123 91');
  console.log('  US:    node fix-phone-numbers.js abc123 1\n');
  process.exit(1);
}

console.log('\n🔧 Fixing phone numbers for user:', uid);
console.log('📞 Country code:', countryCode);
console.log('─'.repeat(60));

async function fixPhoneNumbers() {
  try {
    // Fetch contacts
    const contactsSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('contacts')
      .get();

    if (contactsSnapshot.empty) {
      console.log('\n⚠️  No contacts found for this user\n');
      process.exit(0);
    }

    console.log(`\n✅ Found ${contactsSnapshot.size} contact(s)\n`);

    let fixed = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    for (const doc of contactsSnapshot.docs) {
      const contact = doc.data();
      const contactId = doc.id;
      const phone = contact.phone;

      console.log(`\n📋 Contact: ${contact.name || 'Unnamed'}`);
      console.log(`   ID: ${contactId}`);
      console.log(`   Current phone: ${phone || 'Not set'}`);

      if (!phone) {
        console.log('   ⚠️  Skipping - no phone number');
        errors++;
        continue;
      }

      // Check if already in correct format
      if (phone.startsWith('+')) {
        console.log('   ✅ Already in correct format');
        alreadyCorrect++;
        continue;
      }

      // Fix the phone number
      const fixedPhone = `+${countryCode}${phone}`;
      console.log(`   🔧 Fixing to: ${fixedPhone}`);

      try {
        await db
          .collection('users')
          .doc(uid)
          .collection('contacts')
          .doc(contactId)
          .update({ phone: fixedPhone });

        console.log('   ✅ Updated successfully');
        fixed++;
      } catch (error) {
        console.log('   ❌ Update failed:', error.message);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log('📊 Summary:');
    console.log('─'.repeat(60));
    console.log(`Total contacts: ${contactsSnapshot.size}`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Already correct: ${alreadyCorrect}`);
    console.log(`Errors: ${errors}`);

    if (fixed > 0) {
      console.log('\n✅ Phone numbers fixed!');
      console.log('\n🧪 Test SMS now:');
      console.log(`   node send-test-sms.js +${countryCode}9502381087\n`);
    } else if (alreadyCorrect > 0) {
      console.log('\n✅ All phone numbers are already in correct format!\n');
    } else {
      console.log('\n⚠️  No phone numbers were fixed\n');
    }

    process.exit(0);

  } catch (error) {
    console.log('\n❌ Error:', error.message);
    console.log('\nFull error:', error);
    process.exit(1);
  }
}

fixPhoneNumbers();
