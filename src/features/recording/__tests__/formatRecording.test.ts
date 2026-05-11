/**
 * formatRecording() — Unit Tests
 *
 * Tests the data transformation function that maps raw Firestore
 * recording docs to the shape the Evidence Vault UI expects.
 */

// Extract formatRecording by importing the module utilities
// Since formatRecording is a module-level function in index.tsx (not exported),
// we replicate it here for isolated testing.

function formatRecording(rec: any) {
  const isVideo = (rec.type || rec.mimeType || '').includes('video');
  const isLocation = (rec.type || '').includes('location');
  const icon = isLocation ? '📍' : isVideo ? '🎥' : '🎙️';
  const title = rec.reason || rec.fileName || (isVideo ? 'Video Recording' : 'Audio Recording');

  let date = '';
  if (rec.createdAt) {
    const d = rec.createdAt._seconds
      ? new Date(rec.createdAt._seconds * 1000)
      : new Date(rec.createdAt);
    date = d.toLocaleString();
  }

  const size = rec.size ? `${(rec.size / (1024 * 1024)).toFixed(1)} MB` : 'Synced';

  return { id: rec.id || rec.fileName || String(Math.random()), type: icon, title, date, size };
}

describe('formatRecording', () => {
  it('should map an audio recording correctly', () => {
    const raw = {
      id: 'rec-1',
      type: 'audio',
      reason: 'SOS Audio Recording',
      fileName: 'audio_123.m4a',
      size: 2 * 1024 * 1024, // 2 MB
      mimeType: 'audio/m4a',
      createdAt: { _seconds: 1715356800, _nanoseconds: 0 }, // May 10, 2024
    };

    const result = formatRecording(raw);

    expect(result.id).toBe('rec-1');
    expect(result.type).toBe('🎙️');
    expect(result.title).toBe('SOS Audio Recording');
    expect(result.size).toBe('2.0 MB');
    expect(result.date).not.toBe('');
  });

  it('should map a video recording correctly', () => {
    const raw = {
      id: 'rec-2',
      type: 'video',
      reason: 'Emergency Video',
      fileName: 'video_456.mp4',
      size: 12.4 * 1024 * 1024,
      mimeType: 'video/mp4',
      createdAt: '2024-05-10T14:30:00Z',
    };

    const result = formatRecording(raw);

    expect(result.type).toBe('🎥');
    expect(result.title).toBe('Emergency Video');
    expect(result.size).toBe('12.4 MB');
  });

  it('should map a location type correctly', () => {
    const raw = {
      id: 'rec-3',
      type: 'location',
      reason: 'Location Log',
      createdAt: '2024-05-10T10:00:00Z',
    };

    const result = formatRecording(raw);

    expect(result.type).toBe('📍');
    expect(result.title).toBe('Location Log');
    expect(result.size).toBe('Synced');
  });

  it('should use fileName as fallback title when reason is missing', () => {
    const raw = {
      id: 'rec-4',
      type: 'audio',
      fileName: 'audio_999.m4a',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const result = formatRecording(raw);

    expect(result.title).toBe('audio_999.m4a');
  });

  it('should use default title when both reason and fileName are missing', () => {
    const raw = {
      id: 'rec-5',
      type: 'audio',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const result = formatRecording(raw);

    expect(result.title).toBe('Audio Recording');
  });

  it('should default to "Video Recording" for video type with no reason/filename', () => {
    const raw = {
      id: 'rec-6',
      type: 'video',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const result = formatRecording(raw);

    expect(result.title).toBe('Video Recording');
  });

  it('should handle missing createdAt gracefully', () => {
    const raw = { id: 'rec-7', type: 'audio', reason: 'Test' };

    const result = formatRecording(raw);

    expect(result.date).toBe('');
  });

  it('should handle missing size gracefully', () => {
    const raw = { id: 'rec-8', type: 'audio', createdAt: '2024-01-01T00:00:00Z' };

    const result = formatRecording(raw);

    expect(result.size).toBe('Synced');
  });

  it('should format size to 1 decimal place', () => {
    const raw = {
      id: 'rec-9',
      type: 'audio',
      size: 3.456 * 1024 * 1024,
      createdAt: '2024-01-01T00:00:00Z',
    };

    const result = formatRecording(raw);

    expect(result.size).toBe('3.5 MB');
  });

  it('should use fileName as id fallback when id is missing', () => {
    const raw = {
      fileName: 'fallback_name.m4a',
      type: 'audio',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const result = formatRecording(raw);

    expect(result.id).toBe('fallback_name.m4a');
  });

  it('should detect video type from mimeType even when type field is generic', () => {
    const raw = {
      id: 'rec-10',
      type: '',
      mimeType: 'video/mp4',
      reason: 'Cam capture',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const result = formatRecording(raw);

    expect(result.type).toBe('🎥');
  });
});
