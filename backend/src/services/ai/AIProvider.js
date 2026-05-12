/**
 * AI Provider Service - Centralized AI Integration
 * 
 * Provides a unified interface for AI operations with proper error handling,
 * fallback mechanisms, and timeout management.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { logEvent } = require("../coreServices");

class AIProvider {
  constructor() {
    this.geminiKey = process.env.GEMINI_API_KEY || "";
    this.geminiModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    this.timeout = parseInt(process.env.AI_TIMEOUT_MS || "10000", 10);
    this.maxRetries = parseInt(process.env.AI_MAX_RETRIES || "2", 10);
    this.client = null;
    this.model = null;
    this.isAvailable = false;
    
    this.initialize();
  }

  /**
   * Initialize AI client
   */
  initialize() {
    try {
      if (!this.geminiKey) {
        logEvent("WARN", "AI Provider: GEMINI_API_KEY not configured - AI features will use fallback");
        this.isAvailable = false;
        return;
      }

      this.client = new GoogleGenerativeAI(this.geminiKey);
      this.model = this.client.getGenerativeModel({ 
        model: this.geminiModel,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      });
      
      this.isAvailable = true;
      logEvent("INFO", "✅ AI Provider initialized successfully", {
        model: this.geminiModel,
        timeout: this.timeout,
        maxRetries: this.maxRetries
      });
    } catch (error) {
      logEvent("ERROR", "Failed to initialize AI Provider", { error: error.message });
      this.isAvailable = false;
    }
  }

  /**
   * Check if AI is available
   */
  checkAvailability() {
    return this.isAvailable && this.model !== null;
  }

  /**
   * Generate AI response with timeout and retry logic
   * @param {string} prompt - The prompt to send
   * @param {object} options - Additional options
   * @returns {Promise<string>} AI response
   */
  async generate(prompt, options = {}) {
    if (!this.checkAvailability()) {
      throw new Error("AI Provider not available");
    }

    const {
      systemPrompt = null,
      history = [],
      retryCount = 0,
      temperature = 0.7
    } = options;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("AI request timeout")), this.timeout);
      });

      // Create AI request promise
      const aiPromise = this._executeGeneration(prompt, systemPrompt, history, temperature);

      // Race between timeout and AI response
      const response = await Promise.race([aiPromise, timeoutPromise]);
      
      logEvent("INFO", "AI generation successful", {
        promptLength: prompt.length,
        responseLength: response.length,
        retryCount
      });

      return response;
    } catch (error) {
      logEvent("WARN", "AI generation failed", {
        error: error.message,
        retryCount,
        maxRetries: this.maxRetries
      });

      // Retry logic
      if (retryCount < this.maxRetries) {
        logEvent("INFO", "Retrying AI generation", { attempt: retryCount + 1 });
        return this.generate(prompt, { ...options, retryCount: retryCount + 1 });
      }

      throw error;
    }
  }

  /**
   * Internal method to execute generation
   */
  async _executeGeneration(prompt, systemPrompt, history, temperature) {
    const chatHistory = [];

    // Add system prompt if provided
    if (systemPrompt) {
      chatHistory.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      chatHistory.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }]
      });
    }

    // Add conversation history
    if (history && history.length > 0) {
      history.forEach(msg => {
        chatHistory.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });
    }

    const chat = this.model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature,
      }
    });

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  }

  /**
   * Analyze threat level from text
   * @param {string} text - Text to analyze
   * @returns {Promise<object>} Threat analysis
   */
  async analyzeThreat(text) {
    if (!this.checkAvailability()) {
      // Fallback to regex-based detection
      return this._fallbackThreatAnalysis(text);
    }

    try {
      const prompt = `Analyze this message for safety threats. Respond ONLY with a JSON object (no markdown, no code blocks):
{
  "threatLevel": "none|low|medium|high|critical",
  "confidence": 0.0-1.0,
  "keywords": ["keyword1", "keyword2"],
  "reasoning": "brief explanation"
}

Message: "${text}"`;

      const response = await this.generate(prompt, {
        temperature: 0.3, // Lower temperature for more consistent JSON
        systemPrompt: "You are a safety threat analyzer. Always respond with valid JSON only."
      });

      // Parse JSON response
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const analysis = JSON.parse(cleaned);

      return {
        threatLevel: analysis.threatLevel || 'none',
        confidence: analysis.confidence || 0.5,
        keywords: analysis.keywords || [],
        reasoning: analysis.reasoning || '',
        source: 'ai'
      };
    } catch (error) {
      logEvent("WARN", "AI threat analysis failed, using fallback", { error: error.message });
      return this._fallbackThreatAnalysis(text);
    }
  }

  /**
   * Fallback threat analysis using regex patterns
   */
  _fallbackThreatAnalysis(text) {
    const lowerText = text.toLowerCase();
    
    const criticalPatterns = /(attack|assault|rape|murder|kill|weapon|gun|knife)/i;
    const highPatterns = /(danger|threat|follow|stalk|harass|unsafe|scared|help|sos)/i;
    const mediumPatterns = /(uncomfortable|worried|nervous|suspicious|alone|dark)/i;
    
    let threatLevel = 'none';
    let confidence = 0.5;
    let keywords = [];

    if (criticalPatterns.test(lowerText)) {
      threatLevel = 'critical';
      confidence = 0.9;
      keywords = lowerText.match(criticalPatterns) || [];
    } else if (highPatterns.test(lowerText)) {
      threatLevel = 'high';
      confidence = 0.8;
      keywords = lowerText.match(highPatterns) || [];
    } else if (mediumPatterns.test(lowerText)) {
      threatLevel = 'medium';
      confidence = 0.7;
      keywords = lowerText.match(mediumPatterns) || [];
    }

    return {
      threatLevel,
      confidence,
      keywords: keywords.map(k => k.toLowerCase()),
      reasoning: 'Pattern-based analysis (AI unavailable)',
      source: 'fallback'
    };
  }

  /**
   * Analyze emergency message context
   * @param {string} message - Emergency message
   * @param {object} context - Additional context (location, time, etc.)
   * @returns {Promise<object>} Analysis result
   */
  async analyzeEmergencyMessage(message, context = {}) {
    if (!this.checkAvailability()) {
      return this._fallbackEmergencyAnalysis(message, context);
    }

    try {
      const contextStr = JSON.stringify(context);
      const prompt = `Analyze this emergency situation and provide recommendations. Respond ONLY with JSON:
{
  "severity": "low|medium|high|critical",
  "urgency": "low|medium|high|immediate",
  "recommendedActions": ["action1", "action2"],
  "estimatedRiskScore": 0-100,
  "reasoning": "brief explanation"
}

Message: "${message}"
Context: ${contextStr}`;

      const response = await this.generate(prompt, {
        temperature: 0.3,
        systemPrompt: "You are an emergency situation analyzer. Always respond with valid JSON only."
      });

      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const analysis = JSON.parse(cleaned);

      return {
        severity: analysis.severity || 'medium',
        urgency: analysis.urgency || 'medium',
        recommendedActions: analysis.recommendedActions || [],
        estimatedRiskScore: analysis.estimatedRiskScore || 50,
        reasoning: analysis.reasoning || '',
        source: 'ai'
      };
    } catch (error) {
      logEvent("WARN", "AI emergency analysis failed, using fallback", { error: error.message });
      return this._fallbackEmergencyAnalysis(message, context);
    }
  }

  /**
   * Fallback emergency analysis
   */
  _fallbackEmergencyAnalysis(message, context) {
    const lowerText = message.toLowerCase();
    let severity = 'medium';
    let urgency = 'medium';
    let estimatedRiskScore = 50;
    const recommendedActions = [];

    if (/(attack|assault|weapon|immediate danger)/i.test(lowerText)) {
      severity = 'critical';
      urgency = 'immediate';
      estimatedRiskScore = 95;
      recommendedActions.push('Call emergency services immediately', 'Activate SOS alert', 'Share live location');
    } else if (/(follow|threat|unsafe|scared)/i.test(lowerText)) {
      severity = 'high';
      urgency = 'high';
      estimatedRiskScore = 75;
      recommendedActions.push('Move to public area', 'Alert trusted contacts', 'Prepare to call emergency services');
    } else if (/(uncomfortable|worried|suspicious)/i.test(lowerText)) {
      severity = 'medium';
      urgency = 'medium';
      estimatedRiskScore = 50;
      recommendedActions.push('Stay alert', 'Share location with contacts', 'Avoid isolated areas');
    }

    return {
      severity,
      urgency,
      recommendedActions,
      estimatedRiskScore,
      reasoning: 'Pattern-based analysis (AI unavailable)',
      source: 'fallback'
    };
  }

  /**
   * Contextual risk scoring based on multiple factors
   * @param {object} factors - Risk factors (location, time, behavior, etc.)
   * @returns {Promise<object>} Risk assessment
   */
  async contextualRiskScoring(factors) {
    if (!this.checkAvailability()) {
      return this._fallbackRiskScoring(factors);
    }

    try {
      const factorsStr = JSON.stringify(factors, null, 2);
      const prompt = `Analyze these risk factors and provide a comprehensive risk assessment. Respond ONLY with JSON:
{
  "overallRiskScore": 0-100,
  "riskLevel": "low|medium|high|critical",
  "contributingFactors": [
    {"factor": "name", "weight": 0.0-1.0, "impact": "description"}
  ],
  "recommendations": ["recommendation1", "recommendation2"],
  "confidence": 0.0-1.0
}

Risk Factors:
${factorsStr}`;

      const response = await this.generate(prompt, {
        temperature: 0.3,
        systemPrompt: "You are a safety risk assessment expert. Always respond with valid JSON only."
      });

      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const assessment = JSON.parse(cleaned);

      return {
        overallRiskScore: assessment.overallRiskScore || 50,
        riskLevel: assessment.riskLevel || 'medium',
        contributingFactors: assessment.contributingFactors || [],
        recommendations: assessment.recommendations || [],
        confidence: assessment.confidence || 0.5,
        source: 'ai'
      };
    } catch (error) {
      logEvent("WARN", "AI risk scoring failed, using fallback", { error: error.message });
      return this._fallbackRiskScoring(factors);
    }
  }

  /**
   * Fallback risk scoring
   */
  _fallbackRiskScoring(factors) {
    let score = 0;
    const contributingFactors = [];

    // Time of day (night = higher risk)
    if (factors.timeOfDay) {
      const hour = new Date(factors.timeOfDay).getHours();
      if (hour >= 22 || hour <= 5) {
        score += 20;
        contributingFactors.push({ factor: 'Late night hours', weight: 0.2, impact: 'Increased risk during late hours' });
      }
    }

    // Location isolation
    if (factors.locationIsolation === 'high') {
      score += 25;
      contributingFactors.push({ factor: 'Isolated location', weight: 0.25, impact: 'Remote area with limited help' });
    } else if (factors.locationIsolation === 'medium') {
      score += 15;
    }

    // Behavioral indicators
    if (factors.behavioralIndicators) {
      if (factors.behavioralIndicators.includes('following')) {
        score += 30;
        contributingFactors.push({ factor: 'Being followed', weight: 0.3, impact: 'Direct threat indicator' });
      }
      if (factors.behavioralIndicators.includes('harassment')) {
        score += 25;
        contributingFactors.push({ factor: 'Harassment', weight: 0.25, impact: 'Active threat' });
      }
    }

    // Environmental factors
    if (factors.lighting === 'poor') {
      score += 10;
      contributingFactors.push({ factor: 'Poor lighting', weight: 0.1, impact: 'Reduced visibility' });
    }

    if (factors.crowdDensity === 'low') {
      score += 15;
      contributingFactors.push({ factor: 'Low crowd density', weight: 0.15, impact: 'Limited witnesses/help' });
    }

    score = Math.min(score, 100);

    let riskLevel = 'low';
    if (score > 75) riskLevel = 'critical';
    else if (score > 50) riskLevel = 'high';
    else if (score > 30) riskLevel = 'medium';

    return {
      overallRiskScore: score,
      riskLevel,
      contributingFactors,
      recommendations: this._generateRecommendations(riskLevel),
      confidence: 0.7,
      source: 'fallback'
    };
  }

  /**
   * Generate recommendations based on risk level
   */
  _generateRecommendations(riskLevel) {
    const recommendations = {
      low: ['Stay aware of surroundings', 'Keep phone charged'],
      medium: ['Share location with contacts', 'Avoid isolated areas', 'Stay in well-lit areas'],
      high: ['Alert trusted contacts immediately', 'Move to public area', 'Prepare emergency contacts'],
      critical: ['Call emergency services NOW', 'Activate SOS', 'Get to safety immediately']
    };

    return recommendations[riskLevel] || recommendations.medium;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      available: this.isAvailable,
      model: this.geminiModel,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      configured: !!this.geminiKey
    };
  }
}

// Singleton instance
let aiProviderInstance = null;

function getAIProvider() {
  if (!aiProviderInstance) {
    aiProviderInstance = new AIProvider();
  }
  return aiProviderInstance;
}

module.exports = {
  AIProvider,
  getAIProvider
};
