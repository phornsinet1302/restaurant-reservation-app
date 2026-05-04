/**
 * Configuration for API endpoints
 *
 * Resolution order:
 * 1. EXPO_PUBLIC_BACKEND_URL from .env (explicit override, e.g. production URL)
 * 2. Metro's hostUri when running via Expo on a physical device (auto-follows your Mac's current LAN IP)
 * 3. http://localhost:3000 fallback (iOS/Android simulator, web)
 *
 * This means you never have to edit .env when your Wi-Fi / IP changes.
 */

import axios from 'axios';
import Constants from 'expo-constants';

const BACKEND_PORT = 3000;

function resolveBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, '');
  }

  const hostUri =
    (Constants.expoConfig as any)?.hostUri ||
    (Constants.expoGoConfig as any)?.debuggerHost ||
    (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost ||
    (Constants.manifest as any)?.debuggerHost;

  if (hostUri && typeof hostUri === 'string') {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost') {
      return `http://${host}:${BACKEND_PORT}`;
    }
  }

  return `http://localhost:${BACKEND_PORT}`;
}

const API_BASE_URL = resolveBaseUrl();

if (__DEV__) {
  console.log('[apiConfig] API_BASE_URL =', API_BASE_URL);
}

// Shared axios instance with reasonable timeout
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 seconds
  headers: { 'Content-Type': 'application/json' },
});

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      REGISTER: `${API_BASE_URL}/api/auth/register`,
      LOGIN: `${API_BASE_URL}/api/auth/login`,
      GOOGLE_SIGNUP: `${API_BASE_URL}/api/auth/google-signup`,
      GOOGLE_LOGIN: `${API_BASE_URL}/api/auth/google-login`,
      APPLE_SIGNUP: `${API_BASE_URL}/api/auth/apple-signup`,
      APPLE_LOGIN: `${API_BASE_URL}/api/auth/apple-login`,
      SEND_VERIFICATION_EMAIL: `${API_BASE_URL}/api/auth/send-verification-email`,
      VERIFY_EMAIL: `${API_BASE_URL}/api/auth/verify-email-code`,
      REFRESH_TOKEN: `${API_BASE_URL}/api/auth/refresh-token`,
      ME: `${API_BASE_URL}/api/auth/me`,
      UPDATE_PROFILE: `${API_BASE_URL}/api/auth/update-profile`,
    },
    // Other endpoints
    RESTAURANTS: `${API_BASE_URL}/api/restaurants`,
    LOCATIONS: `${API_BASE_URL}/api/locations`,
    RESERVATIONS: `${API_BASE_URL}/api/reservations`,
    FAVORITES: `${API_BASE_URL}/api/favorites`,
    NOTIFICATIONS: `${API_BASE_URL}/api/notifications`,
    TABLES: `${API_BASE_URL}/api/tables`,
    REVIEWS: `${API_BASE_URL}/api/reviews`,
  },
};

export default API_CONFIG;
