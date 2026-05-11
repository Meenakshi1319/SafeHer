/**
 * SOS Escalation Service — Unit Tests
 *
 * Tests the state machine: idle → warning → escalated, cancellation, and listener logic.
 * Timer-based tests use Jest fake timers.
 */

// Mock the external dependencies before importing the service
jest.mock('@core/api/client', () => ({
  apiPost: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('expo-location', () => ({
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 12.97, longitude: 77.59 } })
  ),
}));

// We need a fresh instance for each test, so we re-require the module
let SOSEscalationService: any;
let sosService: any;

beforeEach(() => {
  jest.useFakeTimers();
  // Clear module cache so each test gets a fresh singleton
  jest.resetModules();
  const mod = require('../sosEscalationService');
  sosService = mod.sosService;
});

afterEach(() => {
  sosService?.destroy();
  jest.useRealTimers();
});

describe('SOSEscalationService', () => {
  describe('Initial state', () => {
    it('should start in idle phase', () => {
      const state = sosService.getState();
      expect(state.phase).toBe('idle');
      expect(state.cycle).toBe(0);
      expect(state.secondsLeft).toBe(10);
      expect(state.reason).toBe('');
    });
  });

  describe('start()', () => {
    it('should transition to warning phase', () => {
      sosService.start('test_trigger');
      const state = sosService.getState();
      expect(state.phase).toBe('warning');
      expect(state.cycle).toBe(0);
      expect(state.secondsLeft).toBe(10);
      expect(state.reason).toBe('test_trigger');
    });

    it('should not restart if already in warning', () => {
      sosService.start('first');
      jest.advanceTimersByTime(3000); // 3 seconds pass
      sosService.start('second'); // should be ignored
      const state = sosService.getState();
      expect(state.reason).toBe('first');
      expect(state.secondsLeft).toBe(7);
    });

    it('should notify listeners on start', () => {
      const listener = jest.fn();
      sosService.onStateChange(listener);
      sosService.start('test');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'warning', reason: 'test' })
      );
    });
  });

  describe('Timer countdown', () => {
    it('should decrement secondsLeft each second', () => {
      sosService.start('test');
      jest.advanceTimersByTime(1000);
      expect(sosService.getState().secondsLeft).toBe(9);
      jest.advanceTimersByTime(4000);
      expect(sosService.getState().secondsLeft).toBe(5);
    });

    it('should advance to next cycle when timer reaches 0', () => {
      sosService.start('test');
      jest.advanceTimersByTime(10000); // complete cycle 0
      const state = sosService.getState();
      expect(state.cycle).toBe(1);
      expect(state.secondsLeft).toBe(10);
    });

    it('should escalate after 3 complete cycles (30 seconds)', () => {
      sosService.start('test');
      jest.advanceTimersByTime(30000); // 3 × 10 seconds
      const state = sosService.getState();
      expect(state.phase).toBe('escalated');
    });
  });

  describe('cancel()', () => {
    it('should transition to safe phase when markSafe is called', () => {
      sosService.start('test');
      sosService.cancel('safe');
      expect(sosService.getState().phase).toBe('safe');
    });

    it('should transition to cancelled phase', () => {
      sosService.start('test');
      sosService.cancel('cancelled');
      expect(sosService.getState().phase).toBe('cancelled');
    });

    it('should reset to idle after 1.5s delay', () => {
      sosService.start('test');
      sosService.cancel('safe');
      expect(sosService.getState().phase).toBe('safe');
      jest.advanceTimersByTime(1500);
      expect(sosService.getState().phase).toBe('idle');
    });

    it('should stop the countdown timer', () => {
      sosService.start('test');
      jest.advanceTimersByTime(3000);
      sosService.cancel('safe');
      const secondsAtCancel = sosService.getState().secondsLeft;
      jest.advanceTimersByTime(5000);
      // After reset to idle, secondsLeft resets to 10
      // But the timer shouldn't keep counting down
      expect(sosService.getState().phase).toBe('idle');
    });
  });

  describe('escalateNow()', () => {
    it('should immediately transition to escalated', () => {
      sosService.start('test');
      sosService.escalateNow('user_confirmed_unsafe');
      expect(sosService.getState().phase).toBe('escalated');
      expect(sosService.getState().reason).toBe('user_confirmed_unsafe');
    });

    it('should stop the countdown timer', () => {
      const listener = jest.fn();
      sosService.start('test');
      sosService.escalateNow('unsafe');
      sosService.onStateChange(listener);
      listener.mockClear();
      jest.advanceTimersByTime(5000);
      // No more ticks should fire after escalation
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('onStateChange() / listener management', () => {
    it('should call listeners on every state change', () => {
      const listener = jest.fn();
      sosService.onStateChange(listener);
      sosService.start('test');
      expect(listener).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1000);
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe when returned function is called', () => {
      const listener = jest.fn();
      const unsub = sosService.onStateChange(listener);
      sosService.start('test');
      expect(listener).toHaveBeenCalledTimes(1);
      unsub();
      jest.advanceTimersByTime(5000);
      expect(listener).toHaveBeenCalledTimes(1); // no more calls
    });

    it('should return a snapshot, not a reference to internal state', () => {
      sosService.start('test');
      const state1 = sosService.getState();
      jest.advanceTimersByTime(1000);
      const state2 = sosService.getState();
      expect(state1.secondsLeft).not.toBe(state2.secondsLeft);
    });
  });

  describe('destroy()', () => {
    it('should reset to idle and stop timers', () => {
      sosService.start('test');
      jest.advanceTimersByTime(5000);
      sosService.destroy();
      expect(sosService.getState().phase).toBe('idle');
      expect(sosService.getState().cycle).toBe(0);
      expect(sosService.getState().secondsLeft).toBe(10);
    });
  });
});
