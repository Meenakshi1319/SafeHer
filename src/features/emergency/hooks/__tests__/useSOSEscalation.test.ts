/**
 * useSOSEscalation Hook — Unit Tests
 *
 * Tests the React hook that bridges the SOS service into component state.
 */

import { renderHook, act } from '@testing-library/react-native';

jest.mock('@core/api/client', () => ({
  apiPost: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 12.97, longitude: 77.59 } })
  ),
}));

jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
}));

import { useSOSEscalation } from '../useSOSEscalation';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useSOSEscalation', () => {
  it('should return idle state initially', () => {
    const { result } = renderHook(() => useSOSEscalation());
    expect(result.current.state.phase).toBe('idle');
    expect(typeof result.current.startSOS).toBe('function');
    expect(typeof result.current.markSafe).toBe('function');
    expect(typeof result.current.cancelSOS).toBe('function');
    expect(typeof result.current.markUnsafe).toBe('function');
  });

  it('startSOS() should transition to warning', () => {
    const { result } = renderHook(() => useSOSEscalation());
    act(() => {
      result.current.startSOS('test_shake');
    });
    expect(result.current.state.phase).toBe('warning');
    expect(result.current.state.reason).toBe('test_shake');
  });

  it('markSafe() should transition to safe then idle', () => {
    const { result } = renderHook(() => useSOSEscalation());
    act(() => {
      result.current.startSOS('test');
    });
    act(() => {
      result.current.markSafe();
    });
    expect(result.current.state.phase).toBe('safe');

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(result.current.state.phase).toBe('idle');
  });

  it('cancelSOS() should transition to cancelled', () => {
    const { result } = renderHook(() => useSOSEscalation());
    act(() => {
      result.current.startSOS('test');
    });
    act(() => {
      result.current.cancelSOS();
    });
    expect(result.current.state.phase).toBe('cancelled');
  });

  it('markUnsafe() should immediately escalate', () => {
    const { result } = renderHook(() => useSOSEscalation());
    act(() => {
      result.current.startSOS('test');
    });
    act(() => {
      result.current.markUnsafe();
    });
    expect(result.current.state.phase).toBe('escalated');
  });

  it('should clean up on unmount', () => {
    const { result, unmount } = renderHook(() => useSOSEscalation());
    act(() => {
      result.current.startSOS('test');
    });
    unmount();
    // After unmount, service should be destroyed (idle)
    // We can't check result.current after unmount, but it shouldn't throw
  });
});
