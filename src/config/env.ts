import Constants from 'expo-constants';

export const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
export const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');

export const ENV = {
  isDevelopment: __DEV__,
  isProduction: !__DEV__,
  apiUrl: API_BASE_URL,
  wsUrl: WS_BASE_URL,
};
