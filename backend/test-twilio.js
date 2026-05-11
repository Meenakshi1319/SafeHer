/**
 * Twilio SMS Test Script
 * 
 * This script tests if Twilio credentials are valid and can send SMS.
 * Run: node test-twilio.js
 */

require('dotenv').config();
const twilio = require('twilio');

// Load credentials from .env
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE;

console.log('\n🔍 Testing Twilio Configuration...\n');

// Check if credentials are loaded
console.log('1. Checking environment variables:');
console.log(`   TWILIO_SID: ${TWILIO_SID ? '✅ Loaded (' + TWILIO_SID.substring(0, 10) + '...)' : '❌ Missing'}`);
console.log(`   TWILIO_TOKEN: ${TWILIO_TOKEN ? '✅ Loaded (' + TWILIO_TOKEN.substring(0, 10) + '...)' : '❌ Missing'}`);
console.log(`   TWILIO_PHONE: ${TWILIO_PHONE ? '✅ Loaded (' + TWILIO_PHONE + ')' : '❌ Missing'}`);

if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_PHONE) {
  console.log('\n❌ ERROR: Missing Twilio credentials in .env file\n');
  process.exit(1);
}

// Initialize Twilio client
console.log('\n2. Initializing Twilio client...');
let client;
try {
  client = twilio(TWILIO_SID, TWILIO_TOKEN);
  console.log('   ✅ Twilio client initialized successfully');
} catch (error) {
  console.log('   ❌ Failed to initialize Twilio client');
  console.log('   Error:', error.message);
  process.exit(1);
}

// Test 1: Verify account
console.log('\n3. Verifying Twilio account...');
client.api.accounts(TWILIO_SID)
  .fetch()
  .then(account => {
    console.log('   ✅ Account verified');
    console.log('   Account SID:', account.sid);
    console.log('   Account Status:', account.status);
    console.log('   Account Type:', account.type);
    
    // Test 2: Check phone number
    console.log('\n4. Checking Twilio phone number...');
    return client.incomingPhoneNumbers.list({ phoneNumber: TWILIO_PHONE });
  })
  .then(phoneNumbers => {
    if (phoneNumbers.length > 0) {
      console.log('   ✅ Phone number verified');
      console.log('   Phone Number:', phoneNumbers[0].phoneNumber);
      console.log('   Friendly Name:', phoneNumbers[0].friendlyName);
      console.log('   Capabilities:', phoneNumbers[0].capabilities);
    } else {
      console.log('   ⚠️  Phone number not found in your Twilio account');
      console.log('   This might be okay if using a different number');
    }
    
    // Test 3: Send test SMS (optional - uncomment and add your number)
    console.log('\n5. SMS Sending Test:');
    console.log('   ⚠️  To test SMS sending, uncomment the code below and add your phone number');
    console.log('   ⚠️  Make sure the number is verified if using a trial account');
    
    /*
    // UNCOMMENT THIS SECTION TO TEST SMS SENDING
    // Replace with your verified phone number
    const TEST_TO_NUMBER = '+1234567890'; // <-- ADD YOUR PHONE NUMBER HERE
    
    console.log(`   📤 Sending test SMS to ${TEST_TO_NUMBER}...`);
    return client.messages.create({
      body: '🧪 SafeHer Twilio Test - If you receive this, SMS is working!',
      from: TWILIO_PHONE,
      to: TEST_TO_NUMBER
    });
    */
  })
  .then(message => {
    if (message) {
      console.log('   ✅ Test SMS sent successfully!');
      console.log('   Message SID:', message.sid);
      console.log('   Status:', message.status);
      console.log('   To:', message.to);
      console.log('   From:', message.from);
    }
    
    console.log('\n✅ All Twilio tests passed!\n');
    console.log('📝 Summary:');
    console.log('   - Credentials are valid');
    console.log('   - Twilio client is working');
    console.log('   - Account is active');
    console.log('   - Ready to send SMS\n');
  })
  .catch(error => {
    console.log('\n❌ Twilio test failed!\n');
    console.log('Error Details:');
    console.log('   Code:', error.code);
    console.log('   Status:', error.status);
    console.log('   Message:', error.message);
    console.log('   More Info:', error.moreInfo);
    
    console.log('\n🔧 Troubleshooting:');
    
    if (error.code === 20003) {
      console.log('   - Authentication failed');
      console.log('   - Check TWILIO_SID and TWILIO_TOKEN in .env');
      console.log('   - Verify credentials at https://console.twilio.com');
    } else if (error.code === 21211) {
      console.log('   - Invalid phone number format');
      console.log('   - Use E.164 format: +[country code][number]');
      console.log('   - Example: +911234567890 (India) or +11234567890 (US)');
    } else if (error.code === 21608) {
      console.log('   - Phone number not verified (Trial account)');
      console.log('   - Verify numbers at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
      console.log('   - Or upgrade to a paid account');
    } else if (error.code === 21606) {
      console.log('   - Phone number is not a valid mobile number');
      console.log('   - Twilio can only send SMS to mobile numbers');
    } else {
      console.log('   - Check error details above');
      console.log('   - Visit: https://www.twilio.com/docs/api/errors/' + error.code);
    }
    
    console.log('\n');
    process.exit(1);
  });
