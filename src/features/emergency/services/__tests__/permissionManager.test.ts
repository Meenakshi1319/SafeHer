/**
 * Permission Manager — Unit Tests
 */

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
}));

jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn(),
}));

import * as Location from 'expo-location';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { requestInitialPermissions } from '../permissionManager';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('requestInitialPermissions', () => {
  it('should request both location and microphone permissions', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });

    await requestInitialPermissions();

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('should warn on location denial but not throw', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });

    await requestInitialPermissions();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Location permission denied'));
    warnSpy.mockRestore();
  });

  it('should warn on microphone denial but not throw', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    await requestInitialPermissions();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Microphone permission denied'));
    warnSpy.mockRestore();
  });

  it('should handle both denials without crashing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (requestRecordingPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });

    await expect(requestInitialPermissions()).resolves.not.toThrow();

    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});
