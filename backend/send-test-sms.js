/**
 * Send Test SMS Script
 * 
 * This script sends a test SMS to verify Twilio is working.
 * Run: node send-test-sms.js +911234567890
 */

require('dotenv').config();
const twilio = require('twilio');

// Load credentials
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE;

// Get phone number from command line
const toNumber = process.argv[2];

if (!toNumber) {
  console.log('\n❌ Please provide a phone number');
  console.log('Usage: node send-test-sms.js +911234567890\n');
  console.log('Examples:');
  console.log('  India: node send-test-sms.js +911234567890');
  console.log('  US:    node send-test-sms.js +11234567890\n');
  console.log('⚠️  Note: For trial accounts, the number must be verified first!');
  console.log('   Verify at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified\n');
  process.exit(1);
}

// Validate phone number format
const phoneRegex = /^\+[1-9]\d{1,14}$/;
if (!phoneRegex.test(toNumber)) {
  console.log('\n❌ Invalid phone number format');
  console.log('   Use E.164 format: +[country code][number]');
  console.log('   Examples:');
  console.log('     India: +911234567890');
  console.log('     US:    +11234567890\n');
  process.exit(1);
}

console.log('\n📱 Sending Test SMS...\n');
console.log('From:', TWILIO_PHONE);
console.log('To:', toNumber);
console.log('');

// Initialize Twilio client
const client = twilio(TWILIO_SID, TWILIO_TOKEN);

// Send SMS
const message = `🧪 SafeHer SMS Test

This is a test message from SafeHer app.

If you receive this, SMS alerts are working correctly!

Time: ${new Date().toLocaleString()}`;

client.messages
  .create({
    body: message,
    from: TWILIO_PHONE,
    to: toNumber
  })
  .then(message => {
    console.log('✅ SMS sent successfully!\n');
    console.log('Message Details:');
    console.log('  SID:', message.sid);
    console.log('  Status:', message.status);
    console.log('  To:', message.to);
    console.log('  From:', message.from);
    console.log('  Date:', message.dateCreated);
    console.log('');
    console.log('📱 Check your phone for the message!');
    console.log('');
    console.log('💡 If you don\'t receive it:');
    console.log('   1. Check if number is verified (trial accounts only)');
    console.log('   2. Check Twilio logs: https://console.twilio.com/us1/monitor/logs/sms');
    console.log('   3. Wait a few minutes (SMS can be delayed)');
    console.log('');
  })
  .catch(error => {
    console.log('❌ Failed to send SMS\n');
    console.log('Error Details:');
    console.log('  Code:', error.code);
    console.log('  Status:', error.status);
    console.log('  Message:', error.message);
    console.log('');
    
    if (error.code === 21608) {
      console.log('🔧 Solution: Verify the phone number');
      console.log('   1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
      console.log('   2. Click "Add a new number"');
      console.log('   3. Enter:', toNumber);
      console.log('   4. Verify with SMS or call');
      console.log('   5. Try again');
      console.log('');
      console.log('   OR upgrade to paid account: https://console.twilio.com/billing');
    } else if (error.code === 21211) {
      console.log('🔧 Solution: Fix phone number format');
      console.log('   Use E.164 format: +[country code][number]');
      console.log('   Examples:');
      console.log('     India: +911234567890');
      console.log('     US:    +11234567890');
    } else if (error.code === 20003) {
      console.log('🔧 Solution: Check Twilio credentials');
      console.log('   Verify TWILIO_SID and TWILIO_TOKEN in .env file');
    } else {
      console.log('🔧 More info:', error.moreInfo || 'https://www.twilio.com/docs/api/errors/' + error.code);
    }
    
    console.log('');
    process.exit(1);
  });
