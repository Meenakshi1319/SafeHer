/**
 * AI Services - Centralized AI operations
 * 
 * Provides high-level AI services for the application
 */

const { getAIProvider } = require('./AIProvider');
const { logEvent } = require('../coreServices');

/**
 * Safety chatbot service
 */
class SafetyChatService {
  constructor() {
    this.aiProvider = getAIProvider();
    this.systemPrompt = `You are SafeHer AI — a women's safety assistant built into a personal safety app.
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
  }

  /**
   * Get chat response
   */
  async getChatResponse(message, history = []) {
    try {
      if (!this.aiProvider.checkAvailability()) {
        logEvent("INFO", "AI unavailable, using fallback response");
        return {
          reply: this._getFallbackResponse(message),
          fallback: true
        };
      }

      const reply = await this.aiProvider.generate(message, {
        systemPrompt: this.systemPrompt,
        history,
        temperature: 0.7
      });

      return {
        reply,
        fallback: false
      };
    } catch (error) {
      logEvent("WARN", "Chat AI failed, using fallback", { error: error.message });
      return {
        reply: this._getFallbackResponse(message),
        fallback: true
      };
    }
  }

  /**
   * Fallback response for when AI is unavailable
   */
  _getFallbackResponse(message) {
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
}

/**
 * Fake call service
 */
class FakeCallService {
  constructor() {
    this.aiProvider = getAIProvider();
  }

  /**
   * Get fake call response
   */
  async getFakeCallResponse(message, callerName = "Dad", history = []) {
    const systemPrompt = `You are pretending to be "${callerName}", the user's protective family member on a phone call. The user is in a potentially unsafe situation and initiated a fake incoming call to deter a threat. Respond naturally as if you are really on the phone — casual, caring, protective. Keep responses to 1-2 sentences. If the user says something alarming, sound concerned and say you're coming right away.`;

    try {
      if (!this.aiProvider.checkAvailability()) {
        return {
          reply: `Hey, I'm almost there! Just stay on the line with me, okay?`,
          fallback: true
        };
      }

      const reply = await this.aiProvider.generate(message, {
        systemPrompt,
        history,
        temperature: 0.8
      });

      return {
        reply,
        fallback: false
      };
    } catch (error) {
      logEvent("WARN", "Fake call AI failed, using fallback", { error: error.message });
      return {
        reply: "I'm on my way, just stay calm. I'll be there in a minute.",
        fallback: true
      };
    }
  }
}

/**
 * Threat analysis service
 */
class ThreatAnalysisService {
  constructor() {
    this.aiProvider = getAIProvider();
  }

  /**
   * Analyze threat from message
   */
  async analyzeThreat(message) {
    try {
      return await this.aiProvider.analyzeThreat(message);
    } catch (error) {
      logEvent("ERROR", "Threat analysis failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze emergency situation
   */
  async analyzeEmergency(message, context = {}) {
    try {
      return await this.aiProvider.analyzeEmergencyMessage(message, context);
    } catch (error) {
      logEvent("ERROR", "Emergency analysis failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate contextual risk score
   */
  async calculateRiskScore(factors) {
    try {
      return await this.aiProvider.contextualRiskScoring(factors);
    } catch (error) {
      logEvent("ERROR", "Risk scoring failed", { error: error.message });
      throw error;
    }
  }
}

// Service instances
const safetyChatService = new SafetyChatService();
const fakeCallService = new FakeCallService();
const threatAnalysisService = new ThreatAnalysisService();

module.exports = {
  safetyChatService,
  fakeCallService,
  threatAnalysisService,
  getAIProvider
};
