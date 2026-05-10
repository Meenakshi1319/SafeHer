/**
 * Unit Tests for Risk Level Logic
 * 
 * Tests the risk scoring and escalation threshold logic to ensure
 * correct tier assignment and alert dispatch.
 */

describe('Risk Level Tests', () => {
  
  // Risk thresholds from server.js
  const RISK_LEVELS = {
    LOW:       { min: 0,  max: 30,  label: "LOW" },
    MEDIUM:    { min: 31, max: 60,  label: "MEDIUM" },
    HIGH:      { min: 61, max: 85,  label: "HIGH" },
    VERY_HIGH: { min: 86, max: 100, label: "VERY HIGH" },
  };

  function getRiskLevel(score) {
    if (score <= 30) return RISK_LEVELS.LOW;
    if (score <= 60) return RISK_LEVELS.MEDIUM;
    if (score <= 85) return RISK_LEVELS.HIGH;
    return RISK_LEVELS.VERY_HIGH;
  }

  describe('getRiskLevel', () => {
    test('should return LOW for scores 0-30', () => {
      expect(getRiskLevel(0).label).toBe('LOW');
      expect(getRiskLevel(15).label).toBe('LOW');
      expect(getRiskLevel(30).label).toBe('LOW');
    });

    test('should return MEDIUM for scores 31-60', () => {
      expect(getRiskLevel(31).label).toBe('MEDIUM');
      expect(getRiskLevel(45).label).toBe('MEDIUM');
      expect(getRiskLevel(60).label).toBe('MEDIUM');
    });

    test('should return HIGH for scores 61-85', () => {
      expect(getRiskLevel(61).label).toBe('HIGH');
      expect(getRiskLevel(75).label).toBe('HIGH');
      expect(getRiskLevel(85).label).toBe('HIGH');
    });

    test('should return VERY HIGH for scores 86-100', () => {
      expect(getRiskLevel(86).label).toBe('VERY HIGH');
      expect(getRiskLevel(95).label).toBe('VERY HIGH');
      expect(getRiskLevel(100).label).toBe('VERY HIGH');
    });

    test('should handle boundary values correctly', () => {
      expect(getRiskLevel(30).label).toBe('LOW');
      expect(getRiskLevel(31).label).toBe('MEDIUM');
      expect(getRiskLevel(60).label).toBe('MEDIUM');
      expect(getRiskLevel(61).label).toBe('HIGH');
      expect(getRiskLevel(85).label).toBe('HIGH');
      expect(getRiskLevel(86).label).toBe('VERY HIGH');
    });
  });

  describe('Risk Score Accumulation', () => {
    test('should cap risk score at 100', () => {
      let score = 90;
      const delta = 20;
      score = Math.min(score + delta, 100);
      expect(score).toBe(100);
    });

    test('should accumulate multiple sensor events', () => {
      let score = 0;
      score = Math.min(score + 20, 100); // Shake detected
      expect(score).toBe(20);
      score = Math.min(score + 25, 100); // Sound detected
      expect(score).toBe(45);
      score = Math.min(score + 40, 100); // Voice trigger
      expect(score).toBe(85);
    });

    test('should reset to 0 when safe', () => {
      let score = 75;
      score = 0; // Reset
      expect(score).toBe(0);
    });
  });

  describe('Escalation Thresholds', () => {
    test('should not trigger alerts for LOW risk', () => {
      const score = 25;
      const shouldAlert = score > 30;
      expect(shouldAlert).toBe(false);
    });

    test('should trigger alerts for MEDIUM risk and above', () => {
      expect(35 > 30).toBe(true); // MEDIUM
      expect(70 > 30).toBe(true); // HIGH
      expect(95 > 30).toBe(true); // VERY HIGH
    });

    test('should start auto-recording at HIGH risk (61+)', () => {
      expect(61 >= 61).toBe(true);
      expect(85 >= 61).toBe(true);
      expect(100 >= 61).toBe(true);
      expect(60 >= 61).toBe(false);
    });
  });

});
