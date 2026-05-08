// Full Integration Test for SafeHer Backend
const BASE = 'http://localhost:5000';

async function post(endpoint, data) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function get(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`);
  return res.json();
}

async function del(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`, { method: 'DELETE' });
  return res.json();
}

async function runTests() {
  console.log('═══════════════════════════════════════');
  console.log('  SafeHer Integration Test Suite');
  console.log('═══════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;
  let testUid = null;
  let contactId = null;
  const testEmail = `test_${Date.now()}@safeher.com`;

  // TEST 1: Signup
  try {
    console.log('1️⃣  POST /signup — Create test account...');
    const res = await post('/signup', {
      name: 'Test User',
      email: testEmail,
      password: 'test123456',
      phone: '',
    });
    if (res.success && res.uid) {
      testUid = res.uid;
      console.log(`   ✅ PASS — UID: ${testUid}\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL — ${res.message}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.message}\n`);
    failed++;
  }

  if (!testUid) {
    console.log('⛔ Cannot continue without a test UID. Aborting.');
    return;
  }

  // TEST 2: Get User Profile
  try {
    console.log('2️⃣  GET /user/:uid — Fetch user profile...');
    const res = await get(`/user/${testUid}`);
    if (res.success && res.user?.email === testEmail) {
      console.log(`   ✅ PASS — Email: ${res.user.email}\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL — ${JSON.stringify(res)}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.message}\n`);
    failed++;
  }

  // TEST 3: Add Contact
  try {
    console.log('3️⃣  POST /contacts/:uid — Add emergency contact...');
    const res = await post(`/contacts/${testUid}`, {
      name: 'Mom',
      phone: '+911234567890',
      type: 'family',
    });
    if (res.success) {
      console.log(`   ✅ PASS — Contact added\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL — ${res.message}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.message}\n`);
    failed++;
  }

  // TEST 4: Get Contacts
  try {
    console.log('4️⃣  GET /contacts/:uid — Fetch contacts...');
    const res = await get(`/contacts/${testUid}`);
    if (res.success && res.contacts?.length > 0) {
      contactId = res.contacts[0].id;
      console.log(`   ✅ PASS — ${res.contacts.length} contact(s) found, ID: ${contactId}\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL — ${JSON.stringify(res)}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.message}\n`);
    failed++;
  }

  // TEST 5: Delete Contact
  if (contactId) {
    try {
      console.log('5️⃣  DELETE /contacts/:uid/:cid — Delete contact...');
      const res = await del(`/contacts/${testUid}/${contactId}`);
      if (res.success) {
        console.log(`   ✅ PASS — Contact deleted\n`);
        passed++;
      } else {
        console.log(`   ❌ FAIL — ${res.message}\n`);
        failed++;
      }
    } catch (e) {
      console.log(`   ❌ FAIL — ${e.message}\n`);
      failed++;
    }
  }

  // TEST 6: Save Location
  try {
    console.log('6️⃣  POST /save-location — Save GPS coordinates...');
    const res = await post('/save-location', {
      uid: testUid,
      latitude: 17.385,
      longitude: 78.4867,
    });
    if (res.success) {
      console.log(`   ✅ PASS — Location saved\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL — ${res.message}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.message}\n`);
    failed++;
  }

  // TEST 7: Update Risk
  try {
    console.log('7️⃣  POST /update-risk — Update risk score...');
    const res = await post('/update-risk', {
      uid: testUid,
      value: 20,
      reason: 'Integration Test',
      source: 'manual',
    });
    if (res.success) {
      console.log(`   ✅ PASS — Risk score: ${res.score}\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL — ${res.message}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.message}\n`);
    failed++;
  }

  // TEST 8: Get Risk
  try {
    console.log('8️⃣  GET /risk/:uid — Get current risk...');
    const res = await get(`/risk/${testUid}`);
    if (res.success && res.score >= 0) {
      console.log(`   ✅ PASS — Score: ${res.score}, Level: ${res.riskLevel}\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL — ${JSON.stringify(res)}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.message}\n`);
    failed++;
  }

  // TEST 9: Sensor Shake
  try {
    console.log('9️⃣  POST /sensor/shake — Shake event...');
    const res = await post('/sensor/shake', { uid: testUid });
    if (res.success) {
      console.log(`   ✅ PASS — Shake registered, risk: ${res.score}\n`);
      passed++;
    } else {
      console.log(`   ❌ FAIL — ${res.message}\n`);
      failed++;
    }
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.message}\n`);
    failed++;
  }

  // RESULTS
  console.log('═══════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  console.log('═══════════════════════════════════════');

  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Backend + Firebase fully integrated!\n');
  } else {
    console.log(`\n⚠️  ${failed} test(s) need attention.\n`);
  }
}

runTests();
