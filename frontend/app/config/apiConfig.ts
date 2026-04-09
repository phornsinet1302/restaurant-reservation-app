/**
 * Configuration for API endpoints
 * 
 * For Expo testing:
 * - Simulator: use 'http://localhost:3000'
 * - Physical device: use 'http://YOUR_LOCAL_IP:3000' (your machine's local IP)
 */

import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

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
  },
};

export default API_CONFIG;
