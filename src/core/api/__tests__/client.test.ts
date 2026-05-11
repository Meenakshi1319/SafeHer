/**
 * API Client — Unit Tests
 *
 * Tests apiPost, apiGet, apiDelete with mocked fetch.
 */

// Mock firebase auth
jest.mock('@core/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid',
      getIdToken: jest.fn(() => Promise.resolve('mock-token-abc')),
    },
  },
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { apiPost, apiGet, apiDelete, BASE_URL } from '../client';

// Helpers
function mockFetchResponse(body: any, ok = true, status = 200) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  (global.fetch as jest.Mock).mockClear();
});

describe('API Client', () => {
  describe('BASE_URL', () => {
    it('should be a string', () => {
      expect(typeof BASE_URL).toBe('string');
    });

    it('should start with http', () => {
      expect(BASE_URL).toMatch(/^http/);
    });
  });

  describe('apiPost()', () => {
    it('should make a POST request with correct headers', async () => {
      mockFetchResponse({ success: true, message: 'OK' });

      await apiPost('/trigger-sos', { uid: 'test', reason: 'test' });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${BASE_URL}/trigger-sos`);
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers.Authorization).toBe('Bearer mock-token-abc');
    });

    it('should send JSON body', async () => {
      mockFetchResponse({ success: true });
      const data = { uid: 'user1', reason: 'shake' };
      await apiPost('/sensor/shake', data);

      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual(data);
    });

    it('should throw on unsuccessful response', async () => {
      mockFetchResponse({ success: false, message: 'Bad Request' }, false, 400);

      await expect(apiPost('/bad-endpoint', {})).rejects.toThrow('Bad Request');
    });

    it('should throw on success:false even with 200 status', async () => {
      mockFetchResponse({ success: false, message: 'uid is required' }, true, 200);

      await expect(apiPost('/update-risk', {})).rejects.toThrow('uid is required');
    });
  });

  describe('apiGet()', () => {
    it('should make a GET request with auth header', async () => {
      mockFetchResponse({ success: true, recordings: [] });

      const result = await apiGet('/recordings/test-uid');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${BASE_URL}/recordings/test-uid`);
      expect(options.headers.Authorization).toBe('Bearer mock-token-abc');
      expect(result.success).toBe(true);
    });

    it('should throw on 404 response', async () => {
      mockFetchResponse({ success: false, message: 'Not found' }, false, 404);

      await expect(apiGet('/recordings/missing')).rejects.toThrow('Not found');
    });
  });

  describe('apiDelete()', () => {
    it('should make a DELETE request', async () => {
      mockFetchResponse({ success: true, message: 'Deleted' });

      const result = await apiDelete('/contacts/uid1/cid1');

      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe(`${BASE_URL}/contacts/uid1/cid1`);
      expect(options.method).toBe('DELETE');
      expect(result.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle empty response body gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(''),
      });

      // Empty body should not crash, but will fail success check
      await expect(apiGet('/empty')).rejects.toThrow();
    });

    it('should handle non-JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(apiGet('/broken')).rejects.toThrow('Internal Server Error');
    });
  });
});
