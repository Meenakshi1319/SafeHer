/**
 * Jest global setup — mocks for native modules that don't exist in the test env.
 */

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 12.97, longitude: 77.59 } })
  ),
}));

// Mock expo-audio
jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  useAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), loop: false })),
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(),
    record: jest.fn(),
    stop: jest.fn(),
    uri: null,
  })),
  setAudioModeAsync: jest.fn(),
  RecordingPresets: { HIGH_QUALITY: {} },
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Error: 'error', Success: 'success', Warning: 'warning' },
}));

// Mock firebase
jest.mock('@core/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-uid-123', getIdToken: jest.fn(() => Promise.resolve('fake-token')) },
  },
}));

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve(JSON.stringify({ success: true })),
    json: () => Promise.resolve({ success: true }),
  })
);
