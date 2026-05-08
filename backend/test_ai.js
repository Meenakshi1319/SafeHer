// Quick test for the AI chat endpoint
async function test() {
  try {
    const res = await fetch('http://localhost:5000/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'I feel unsafe walking home at night. What should I do?' }),
    });
    const data = await res.json();
    console.log('AI Response:', data.success ? '✅' : '❌');
    console.log(data.reply || data.message);
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }
}
test();
