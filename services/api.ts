// For Android Emulator, use 10.0.2.2. For iOS Simulator/Web use localhost.
// Replace this with your actual local IP address when running on a physical device!
export const BASE_URL = 'http://10.104.102.156:5000';

export async function apiPost(endpoint: string, data: any = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const json = await parseApiResponse(response);
  if (!response.ok || !json.success) {
    throw new Error(json.message || `API Error (${response.status})`);
  }
  return json;
}

export async function apiGet(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  const json = await parseApiResponse(response);
  if (!response.ok || !json.success) {
    throw new Error(json.message || `API Error (${response.status})`);
  }
  return json;
}

async function parseApiResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      message: text,
    };
  }
}
