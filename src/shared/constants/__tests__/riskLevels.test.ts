import { getRiskLevel, getRiskColor, getRiskLabel, RISK_THRESHOLDS, RISK_LEVELS } from '../riskLevels';

describe('Risk Levels Configuration', () => {
  describe('RISK_THRESHOLDS', () => {
    it('should have correct threshold values in ascending order', () => {
      expect(RISK_THRESHOLDS.LOW).toBeLessThan(RISK_THRESHOLDS.MEDIUM);
      expect(RISK_THRESHOLDS.MEDIUM).toBeLessThan(RISK_THRESHOLDS.HIGH);
      expect(RISK_THRESHOLDS.HIGH).toBeLessThan(RISK_THRESHOLDS.VERY_HIGH);
      expect(RISK_THRESHOLDS.VERY_HIGH).toBe(100);
    });
  });

  describe('getRiskLevel', () => {
    it('should return LOW for scores <= LOW threshold', () => {
      expect(getRiskLevel(0)).toEqual(RISK_LEVELS.LOW);
      expect(getRiskLevel(15)).toEqual(RISK_LEVELS.LOW);
      expect(getRiskLevel(RISK_THRESHOLDS.LOW)).toEqual(RISK_LEVELS.LOW);
    });

    it('should return MEDIUM for scores between LOW and MEDIUM threshold', () => {
      expect(getRiskLevel(RISK_THRESHOLDS.LOW + 1)).toEqual(RISK_LEVELS.MEDIUM);
      expect(getRiskLevel(45)).toEqual(RISK_LEVELS.MEDIUM);
      expect(getRiskLevel(RISK_THRESHOLDS.MEDIUM)).toEqual(RISK_LEVELS.MEDIUM);
    });

    it('should return HIGH for scores between MEDIUM and HIGH threshold', () => {
      expect(getRiskLevel(RISK_THRESHOLDS.MEDIUM + 1)).toEqual(RISK_LEVELS.HIGH);
      expect(getRiskLevel(75)).toEqual(RISK_LEVELS.HIGH);
      expect(getRiskLevel(RISK_THRESHOLDS.HIGH)).toEqual(RISK_LEVELS.HIGH);
    });

    it('should return VERY_HIGH for scores > HIGH threshold', () => {
      expect(getRiskLevel(RISK_THRESHOLDS.HIGH + 1)).toEqual(RISK_LEVELS.VERY_HIGH);
      expect(getRiskLevel(95)).toEqual(RISK_LEVELS.VERY_HIGH);
      expect(getRiskLevel(100)).toEqual(RISK_LEVELS.VERY_HIGH);
      expect(getRiskLevel(150)).toEqual(RISK_LEVELS.VERY_HIGH); // Testing out of bounds
    });
  });

  describe('getRiskColor', () => {
    it('should return correct colors for respective scores', () => {
      expect(getRiskColor(20)).toBe(RISK_LEVELS.LOW.color);
      expect(getRiskColor(50)).toBe(RISK_LEVELS.MEDIUM.color);
      expect(getRiskColor(80)).toBe(RISK_LEVELS.HIGH.color);
      expect(getRiskColor(95)).toBe(RISK_LEVELS.VERY_HIGH.color);
    });
  });

  describe('getRiskLabel', () => {
    it('should return correct labels for respective scores', () => {
      expect(getRiskLabel(20)).toBe(RISK_LEVELS.LOW.label);
      expect(getRiskLabel(50)).toBe(RISK_LEVELS.MEDIUM.label);
      expect(getRiskLabel(80)).toBe(RISK_LEVELS.HIGH.label);
      expect(getRiskLabel(95)).toBe(RISK_LEVELS.VERY_HIGH.label);
    });
  });
});
