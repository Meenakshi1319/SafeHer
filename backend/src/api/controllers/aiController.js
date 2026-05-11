/**
 * AI Safety Chatbot + Fake Call Routes — /ai/chat, /ai/fake-call
 */
const express = require("express");
const router  = express.Router();
const { geminiModel } = require('../../config/dependencies');
const { logEvent, getSession } = require('../../services/coreServices');

const SAFETY_SYSTEM_PROMPT = `You are SafeHer AI — a women's safety assistant built into a personal safety app.
Your role is to provide:
- Immediate safety advice when the user feels threatened
- Self-defense tips and escape strategies
- Guidance on using the app's SOS features
- Emotional support and reassurance
- Information about emergency helplines in India (Women Helpline: 1091, Police: 100, Ambulance: 108)
- Travel safety tips for women

Rules:
- Keep responses SHORT (2-4 sentences max) unless the user asks for detail
- Be empathetic, calm, and reassuring
- If the user says they are in IMMEDIATE danger, tell them to press the SOS button NOW and call 100
- Never give medical or legal advice — direct them to professionals
- Use emojis sparingly for warmth
- Always prioritize the user's safety above everything`;

function getLocalSafetyReply(message) {
  const text = String(message || "").toLowerCase();

  if (/(immediate|danger|unsafe|threat|follow|attack|emergency|help|sos)/.test(text)) {
    return "If you feel in immediate danger, press the SOS button now and call 100. Move toward a public, well-lit place, share your live location with a trusted contact, and avoid confronting the person directly.";
  }
  if (/(night|late|travel|cab|taxi|auto|walk|alone)/.test(text)) {
    return "For night travel, share your live location, choose well-lit main roads, keep your phone charged, and sit near the driver-side rear seat in a cab. If anything feels wrong, call someone and move to a busier area.";
  }
  if (/(self.?defen[cs]e|defend|grab|escape|pepper)/.test(text)) {
    return "Focus on creating distance, not fighting. Use your voice loudly, target an opening to escape, protect your head and neck, and run toward people or light as soon as you can.";
  }
  if (/(number|helpline|police|ambulance|india)/.test(text)) {
    return "In India, call Police 100, Women Helpline 1091, Ambulance 108, or the national emergency number 112. If you are using SafeHer, press SOS so your trusted contacts also get alerted.";
  }
  if (/(route|map|location|share)/.test(text)) {
    return "Use the Safe Route Map, prefer main roads, and share your live location before starting. If the route feels isolated, change direction toward a crowded or well-lit place.";
  }
  return "I can help with emergency steps, safer routes, night travel, self-defense basics, and helpline numbers. If this is urgent, press SOS and call 100 immediately.";
}

module.exports = function(middlewares = {}) {
  const { requireAuth = (req, res, next) => next(), requireSelfOrAdmin = (req, res, next) => next() } = middlewares;

  router.post("/ai/stealth/toggle", requireAuth, requireSelfOrAdmin, async (req, res) => {
    try {
      const { uid, enabled } = req.body;
      if (!uid) return res.status(400).json({ success: false, message: "uid is required" });
      const session = getSession(uid);
      session.stealthMode = !!enabled;
      logEvent("STEALTH", `Stealth mode ${session.stealthMode ? 'ON' : 'OFF'} for ${uid}`);
      res.status(200).json({ success: true, stealthMode: session.stealthMode });
    } catch (error) {
      logEvent("ERROR", "stealth toggle failed", { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.post("/ai/chat", async (req, res) => {
    try {
      const { message, history = [] } = req.body;
      if (!message || !message.trim()) return res.status(400).json({ success: false, message: "Message is required" });

      if (!geminiModel) {
        logEvent("AI", "Using local fallback because Gemini is not configured", { messageLength: message.length });
        return res.status(200).json({ success: true, reply: getLocalSafetyReply(message), fallback: true });
      }

      const chatHistory = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const chat = geminiModel.startChat({
        history: [
          { role: 'user', parts: [{ text: 'You are SafeHer AI. Follow these instructions: ' + SAFETY_SYSTEM_PROMPT }] },
          { role: 'model', parts: [{ text: 'Understood. I am SafeHer AI, your personal safety assistant. How can I help you stay safe? 🛡️' }] },
          ...chatHistory,
        ],
      });

      const result = await chat.sendMessage(message);
      const reply  = result.response.text();
      logEvent("AI", `Chat response generated`, { messageLength: message.length });
      res.status(200).json({ success: true, reply });
    } catch (error) {
      const message = req.body?.message || "";
      logEvent("WARN", "AI provider unavailable; using local fallback", { error: error.message });
      res.status(200).json({ success: true, reply: getLocalSafetyReply(message), fallback: true });
    }
  });

  // Fake-call AI endpoint (already referenced by frontend FakeCallOverlay)
  router.post("/ai/fake-call", async (req, res) => {
    try {
      const { message, callerName = "Dad", history = [] } = req.body;
      if (!message) return res.status(400).json({ success: false, message: "Message is required" });

      const fakeCallPrompt = `You are pretending to be "${callerName}", the user's protective family member on a phone call. The user is in a potentially unsafe situation and initiated a fake incoming call to deter a threat. Respond naturally as if you are really on the phone — casual, caring, protective. Keep responses to 1-2 sentences. If the user says something alarming, sound concerned and say you're coming right away.`;

      if (!geminiModel) {
        return res.status(200).json({ success: true, reply: `Hey, I'm almost there! Just stay on the line with me, okay?`, fallback: true });
      }

      const chatHistory = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      const chat = geminiModel.startChat({
        history: [
          { role: 'user', parts: [{ text: fakeCallPrompt }] },
          { role: 'model', parts: [{ text: `Hey! I'm on my way, just a few minutes out. Everything okay?` }] },
          ...chatHistory,
        ],
      });

      const result = await chat.sendMessage(message);
      const reply  = result.response.text();
      res.status(200).json({ success: true, reply });
    } catch (error) {
      logEvent("WARN", "Fake call AI failed", { error: error.message });
      res.status(200).json({ success: true, reply: "I'm on my way, just stay calm. I'll be there in a minute.", fallback: true });
    }
  });

  return router;
};
