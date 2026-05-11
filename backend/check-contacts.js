/**
 * Check Contacts Script
 * 
 * This script checks contacts in Firestore and validates phone numbers.
 * Run: node check-contacts.js <uid>
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

// Get UID from command line argument
const uid = process.argv[2];

if (!uid) {
  console.log('\n❌ Please provide a user ID');
  console.log('Usage: node check-contacts.js <uid>\n');
  console.log('Example: node check-contacts.js abc123\n');
  process.exit(1);
}

console.log('\n🔍 Checking contacts for user:', uid);
console.log('─'.repeat(60));

async function checkContacts() {
  try {
    // Fetch contacts
    const contactsSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('contacts')
      .get();

    if (contactsSnapshot.empty) {
      console.log('\n⚠️  No contacts found for this user');
      console.log('\n💡 To add contacts:');
      console.log('   1. Open the SafeHer app');
      console.log('   2. Go to Contacts tab');
      console.log('   3. Add emergency contacts\n');
      process.exit(0);
    }

    console.log(`\n✅ Found ${contactsSnapshot.size} contact(s)\n`);

    const contacts = [];
    contactsSnapshot.forEach(doc => {
      contacts.push({ id: doc.id, ...doc.data() });
    });

    // Display contacts
    console.log('📋 Contact Details:');
    console.log('─'.repeat(60));

    contacts.forEach((contact, index) => {
      console.log(`\n${index + 1}. ${contact.name || 'Unnamed'}`);
      console.log(`   ID: ${contact.id}`);
      console.log(`   Type: ${contact.type || 'Not specified'}`);
      console.log(`   Phone: ${contact.phone || 'Not specified'}`);
      
      // Validate phone number format
      if (contact.phone) {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (phoneRegex.test(contact.phone)) {
          console.log(`   Format: ✅ Valid E.164 format`);
        } else {
          console.log(`   Format: ❌ Invalid - should be +[country code][number]`);
          console.log(`   Example: +911234567890 (India) or +11234567890 (US)`);
        }
      } else {
        console.log(`   Format: ❌ Phone number missing`);
      }
      
      // Check if type is valid for SMS dispatch
      const validTypes = ['family', 'trusted', 'volunteer', 'ngo', 'police', 'emergency'];
      if (validTypes.includes(contact.type)) {
        console.log(`   SMS Eligible: ✅ Yes (type: ${contact.type})`);
      } else {
        console.log(`   SMS Eligible: ❌ No (invalid type: ${contact.type})`);
        console.log(`   Valid types: ${validTypes.join(', ')}`);
      }
    });

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log('📊 Summary:');
    console.log('─'.repeat(60));

    const totalContacts = contacts.length;
    const validPhones = contacts.filter(c => c.phone && /^\+[1-9]\d{1,14}$/.test(c.phone)).length;
    const validTypes = contacts.filter(c => ['family', 'trusted', 'volunteer', 'ngo', 'police', 'emergency'].includes(c.type)).length;
    const smsEligible = contacts.filter(c => 
      c.phone && 
      /^\+[1-9]\d{1,14}$/.test(c.phone) && 
      ['family', 'trusted', 'volunteer', 'ngo', 'police', 'emergency'].includes(c.type)
    ).length;

    console.log(`Total Contacts: ${totalContacts}`);
    console.log(`Valid Phone Numbers: ${validPhones}/${totalContacts}`);
    console.log(`Valid Contact Types: ${validTypes}/${totalContacts}`);
    console.log(`SMS Eligible: ${smsEligible}/${totalContacts}`);

    if (smsEligible === 0) {
      console.log('\n⚠️  WARNING: No contacts are eligible for SMS!');
      console.log('\n🔧 To fix:');
      console.log('   1. Ensure contacts have valid phone numbers (+[country][number])');
      console.log('   2. Ensure contacts have valid types (family, trusted, volunteer, etc.)');
    } else {
      console.log(`\n✅ ${smsEligible} contact(s) eligible for SMS dispatch`);
    }

    // Twilio Trial Account Warning
    console.log('\n' + '─'.repeat(60));
    console.log('⚠️  TWILIO TRIAL ACCOUNT RESTRICTION:');
    console.log('─'.repeat(60));
    console.log('Your Twilio account is a TRIAL account.');
    console.log('Trial accounts can ONLY send SMS to VERIFIED phone numbers.\n');
    console.log('📱 Verified Numbers:');
    console.log('   Visit: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
    console.log('   Add and verify each contact\'s phone number\n');
    console.log('OR\n');
    console.log('💳 Upgrade Account:');
    console.log('   Visit: https://console.twilio.com/billing');
    console.log('   Upgrade to a paid account to send to any number\n');

    // List phone numbers that need verification
    if (smsEligible > 0) {
      console.log('📋 Phone numbers that need verification:');
      contacts
        .filter(c => 
          c.phone && 
          /^\+[1-9]\d{1,14}$/.test(c.phone) && 
          ['family', 'trusted', 'volunteer', 'ngo', 'police', 'emergency'].includes(c.type)
        )
        .forEach(c => {
          console.log(`   - ${c.phone} (${c.name})`);
        });
    }

    console.log('\n');
    process.exit(0);

  } catch (error) {
    console.log('\n❌ Error checking contacts:', error.message);
    console.log('\nFull error:', error);
    process.exit(1);
  }
}

checkContacts();
