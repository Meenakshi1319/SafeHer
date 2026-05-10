import { Platform } from "react-native";
import { auth } from "./firebase";

/**
 * Base URL for the SafeHer backend.
 *
 * Priority order:
 *   1. EXPO_PUBLIC_API_URL  — set in .env.local for your machine/environment
 *   2. Fallback             — localhost for web/iOS simulator
 *
 * Common values:
 *   Android emulator  → http://10.0.2.2:5000
 *   iOS simulator     → http://localhost:5000
 *   Physical device   → http://<your-local-ip>:5000
 *
 * Create a .env.local file in the project root and add:
 *   EXPO_PUBLIC_API_URL=http://10.104.102.156:5000
 */
function getDefaultBaseUrl() {
  if (Platform.OS === "android") return "http://10.0.2.2:5000";
  return "http://localhost:5000";
}

export const BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_URL as string) || getDefaultBaseUrl();

async function getAuthHeaders() {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiPost(endpoint: string, data: any = {}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
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
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: authHeaders,
  });
  const json = await parseApiResponse(response);
  if (!response.ok || !json.success) {
    throw new Error(json.message || `API Error (${response.status})`);
  }
  return json;
}

export async function apiDelete(endpoint: string) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
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
