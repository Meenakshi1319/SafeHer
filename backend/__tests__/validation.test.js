/**
 * Unit Tests for Input Validation Middleware
 * 
 * Tests all validation functions to ensure proper input sanitization
 * and security against injection attacks.
 */

const {
  validateUid,
  validateEmail,
  validatePhone,
  validateLatitude,
  validateLongitude,
  validateRiskScore,
  sanitizeString,
} = require('../middleware/validation');

describe('Input Validation Tests', () => {
  
  describe('validateUid', () => {
    test('should accept valid UIDs', () => {
      expect(validateUid('user123')).toBe(true);
      expect(validateUid('test-user_456')).toBe(true);
      expect(validateUid('a')).toBe(true);
    });

    test('should reject invalid UIDs', () => {
      expect(validateUid('')).toBe(false);
      expect(validateUid(null)).toBe(false);
      expect(validateUid(undefined)).toBe(false);
      expect(validateUid('user@123')).toBe(false); // @ not allowed
      expect(validateUid('user 123')).toBe(false); // space not allowed
      expect(validateUid('a'.repeat(129))).toBe(false); // too long
    });
  });

  describe('validateEmail', () => {
    test('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    test('should accept valid E.164 phone numbers', () => {
      expect(validatePhone('+911234567890')).toBe(true);
      expect(validatePhone('+12025551234')).toBe(true);
      expect(validatePhone('+447911123456')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(validatePhone('1234567890')).toBe(false); // missing +
      expect(validatePhone('+0123456789')).toBe(false); // starts with 0
      expect(validatePhone('+1')).toBe(false); // too short
      expect(validatePhone('+12345678901234567')).toBe(false); // too long
    });
  });

  describe('validateLatitude', () => {
    test('should accept valid latitudes', () => {
      expect(validateLatitude(0)).toBe(true);
      expect(validateLatitude(45.5)).toBe(true);
      expect(validateLatitude(-45.5)).toBe(true);
      expect(validateLatitude(90)).toBe(true);
      expect(validateLatitude(-90)).toBe(true);
    });

    test('should reject invalid latitudes', () => {
      expect(validateLatitude(91)).toBe(false);
      expect(validateLatitude(-91)).toBe(false);
      expect(validateLatitude('not a number')).toBe(false);
      expect(validateLatitude(NaN)).toBe(false);
    });
  });

  describe('validateLongitude', () => {
    test('should accept valid longitudes', () => {
      expect(validateLongitude(0)).toBe(true);
      expect(validateLongitude(120.5)).toBe(true);
      expect(validateLongitude(-120.5)).toBe(true);
      expect(validateLongitude(180)).toBe(true);
      expect(validateLongitude(-180)).toBe(true);
    });

    test('should reject invalid longitudes', () => {
      expect(validateLongitude(181)).toBe(false);
      expect(validateLongitude(-181)).toBe(false);
      expect(validateLongitude('not a number')).toBe(false);
    });
  });

  describe('validateRiskScore', () => {
    test('should accept valid risk scores', () => {
      expect(validateRiskScore(0)).toBe(true);
      expect(validateRiskScore(50)).toBe(true);
      expect(validateRiskScore(100)).toBe(true);
    });

    test('should reject invalid risk scores', () => {
      expect(validateRiskScore(-1)).toBe(false);
      expect(validateRiskScore(101)).toBe(false);
      expect(validateRiskScore('not a number')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    test('should remove control characters', () => {
      const input = 'Hello\x00World\x1F';
      const output = sanitizeString(input);
      expect(output).toBe('HelloWorld');
    });

    test('should preserve newlines and tabs', () => {
      const input = 'Line1\nLine2\tTabbed';
      const output = sanitizeString(input);
      expect(output).toBe('Line1\nLine2\tTabbed');
    });

    test('should trim whitespace', () => {
      const input = '  Hello World  ';
      const output = sanitizeString(input);
      expect(output).toBe('Hello World');
    });

    test('should enforce max length', () => {
      const input = 'a'.repeat(2000);
      const output = sanitizeString(input, 100);
      expect(output.length).toBe(100);
    });

    test('should handle empty/null input', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });
  });

});
