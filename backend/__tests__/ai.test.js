/**
 * AI Provider Service Tests
 * 
 * Tests for AI-powered threat analysis, emergency message analysis,
 * and contextual risk scoring with fallback mechanisms.
 */

const { AIProvider, getAIProvider } = require('../src/services/ai/AIProvider');

describe('AI Provider Service', () => {
  let aiProvider;

  beforeEach(() => {
    aiProvider = new AIProvider();
  });

  describe('Initialization', () => {
    test('should initialize without throwing errors', () => {
      expect(() => new AIProvider()).not.toThrow();
    });

    test('should return singleton instance', () => {
      const instance1 = getAIProvider();
      const instance2 = getAIProvider();
      expect(instance1).toBe(instance2);
    });

    test('should have correct status structure', () => {
      const status = aiProvider.getStatus();
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('model');
      expect(status).toHaveProperty('timeout');
      expect(status).toHaveProperty('maxRetries');
      expect(status).toHaveProperty('configured');
    });
  });

  describe('Threat Analysis', () => {
    test('should analyze critical threat keywords', async () => {
      const result = await aiProvider.analyzeThreat('Someone is attacking me with a weapon');
      
      expect(result).toHaveProperty('threatLevel');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('source');
      
      expect(['critical', 'high']).toContain(result.threatLevel);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should analyze high threat keywords', async () => {
      const result = await aiProvider.analyzeThreat('Someone is following me and I feel unsafe');
      
      expect(result.threatLevel).toBe('high');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    test('should analyze medium threat keywords', async () => {
      const result = await aiProvider.analyzeThreat('I feel uncomfortable in this dark area');
      
      expect(result.threatLevel).toBe('medium');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test('should return none for safe messages', async () => {
      const result = await aiProvider.analyzeThreat('I am walking home safely');
      
      expect(result.threatLevel).toBe('none');
    });

    test('should handle empty messages', async () => {
      const result = await aiProvider.analyzeThreat('');
      
      expect(result).toHaveProperty('threatLevel');
      expect(result.threatLevel).toBe('none');
    });
  });

  describe('Emergency Message Analysis', () => {
    test('should analyze critical emergency', async () => {
      const result = await aiProvider.analyzeEmergencyMessage(
        'Someone is attacking me right now!',
        { location: { lat: 28.6139, lng: 77.2090 }, timeOfDay: new Date() }
      );
      
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('urgency');
      expect(result).toHaveProperty('recommendedActions');
      expect(result).toHaveProperty('estimatedRiskScore');
      expect(result).toHaveProperty('reasoning');
      
      expect(['critical', 'high']).toContain(result.severity);
      expect(['immediate', 'high']).toContain(result.urgency);
      expect(result.estimatedRiskScore).toBeGreaterThan(70);
      expect(Array.isArray(result.recommendedActions)).toBe(true);
    });

    test('should analyze medium emergency', async () => {
      const result = await aiProvider.analyzeEmergencyMessage(
        'I feel uncomfortable, someone is following me',
        { location: { lat: 28.6139, lng: 77.2090 } }
      );
      
      expect(['high', 'medium']).toContain(result.severity);
      expect(result.estimatedRiskScore).toBeGreaterThan(40);
    });

    test('should provide recommended actions', async () => {
      const result = await aiProvider.analyzeEmergencyMessage(
        'Emergency help needed',
        {}
      );
      
      expect(result.recommendedActions).toBeDefined();
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  describe('Contextual Risk Scoring', () => {
    test('should score high risk for late night + isolated location', async () => {
      const lateNight = new Date();
      lateNight.setHours(23, 0, 0);
      
      const result = await aiProvider.contextualRiskScoring({
        timeOfDay: lateNight,
        locationIsolation: 'high',
        lighting: 'poor',
        crowdDensity: 'low'
      });
      
      expect(result).toHaveProperty('overallRiskScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('contributingFactors');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('confidence');
      
      expect(result.overallRiskScore).toBeGreaterThan(50);
      expect(['high', 'critical']).toContain(result.riskLevel);
    });

    test('should score critical risk for being followed', async () => {
      const result = await aiProvider.contextualRiskScoring({
        behavioralIndicators: ['following', 'harassment'],
        locationIsolation: 'high',
        lighting: 'poor'
      });
      
      expect(result.overallRiskScore).toBeGreaterThan(70);
      expect(['high', 'critical']).toContain(result.riskLevel);
    });

    test('should score low risk for safe conditions', async () => {
      const daytime = new Date();
      daytime.setHours(14, 0, 0);
      
      const result = await aiProvider.contextualRiskScoring({
        timeOfDay: daytime,
        locationIsolation: 'low',
        lighting: 'good',
        crowdDensity: 'high'
      });
      
      expect(result.overallRiskScore).toBeLessThan(40);
      expect(['low', 'medium']).toContain(result.riskLevel);
    });

    test('should provide contributing factors', async () => {
      const result = await aiProvider.contextualRiskScoring({
        locationIsolation: 'high',
        lighting: 'poor'
      });
      
      expect(Array.isArray(result.contributingFactors)).toBe(true);
      expect(result.contributingFactors.length).toBeGreaterThan(0);
      
      if (result.contributingFactors.length > 0) {
        expect(result.contributingFactors[0]).toHaveProperty('factor');
        expect(result.contributingFactors[0]).toHaveProperty('weight');
        expect(result.contributingFactors[0]).toHaveProperty('impact');
      }
    });

    test('should provide recommendations based on risk level', async () => {
      const result = await aiProvider.contextualRiskScoring({
        behavioralIndicators: ['following']
      });
      
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback Mechanisms', () => {
    test('should use fallback when AI unavailable', async () => {
      // Force AI to be unavailable
      aiProvider.isAvailable = false;
      
      const result = await aiProvider.analyzeThreat('Someone is attacking me');
      
      expect(result.source).toBe('fallback');
      expect(result.threatLevel).toBe('critical');
    });

    test('should handle AI errors gracefully', async () => {
      // This should not throw even if AI fails
      const result = await aiProvider.analyzeThreat('test message');
      
      expect(result).toHaveProperty('threatLevel');
      expect(result).toHaveProperty('source');
    });
  });

  describe('Service Status', () => {
    test('should return complete status information', () => {
      const status = aiProvider.getStatus();
      
      expect(typeof status.available).toBe('boolean');
      expect(typeof status.model).toBe('string');
      expect(typeof status.timeout).toBe('number');
      expect(typeof status.maxRetries).toBe('number');
      expect(typeof status.configured).toBe('boolean');
    });
  });
});
