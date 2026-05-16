/**
 * src/api/demoApi.js
 * 
 * Demo mode API client for Augmont QA testing.
 * Drop this file into your existing src/api/ directory.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://uatbckend.karatly.net';

// The magic demo phone number Augmont QA uses
export const DEMO_PHONE     = '9999999999';
export const DEMO_UNIQUE_ID = 'DEMO-AUG-QA-001';
export const DEMO_OTP       = '000000';

/**
 * Check if a phone number is the demo number.
 */
export function isDemoPhone(phone) {
  return phone?.replace(/\s/g, '') === DEMO_PHONE;
}

/**
 * Demo login — bypasses OTP entirely, returns session token + user.
 * Call this instead of the normal sendOtp → verifyOtp flow when
 * isDemoPhone(phone) is true.
 *
 * @param {string} phone  - must be 9999999999
 * @param {string} email  - any valid email from QA tester
 * @param {string} name   - optional display name
 */
export async function demoLogin({ phone, email, name = 'QA Tester' }) {
  const response = await axios.post(`${BASE_URL}/api/v1/demo/login`, {
    phone,
    email,
    name,
  });

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Demo login failed');
  }

  const { token, user } = response.data.payload;

  // Store in the same way your normal auth flow does
  localStorage.setItem('authToken', token);
  localStorage.setItem('userUniqueId', user.uniqueId);
  localStorage.setItem('isDemoUser', 'true');
  localStorage.setItem('userPhone', user.phone);
  localStorage.setItem('userEmail', user.email);
  localStorage.setItem('userName', user.name);

  return { token, user };
}

/**
 * Check demo status from backend (useful for health check).
 */
export async function getDemoStatus() {
  const response = await axios.get(`${BASE_URL}/api/v1/demo/status`);
  return response.data;
}

/**
 * Trigger one-time demo user provisioning.
 * Should only be called by developer/admin with the secret.
 */
export async function setupDemoUser(secret) {
  const response = await axios.post(
    `${BASE_URL}/api/v1/demo/setup`,
    {},
    { headers: { 'X-Demo-Secret': secret } }
  );
  return response.data;
}

/**
 * Clear demo session (logout).
 */
export function clearDemoSession() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userUniqueId');
  localStorage.removeItem('isDemoUser');
  localStorage.removeItem('userPhone');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
}

/**
 * Check if current session is a demo session.
 */
export function isCurrentSessionDemo() {
  return localStorage.getItem('isDemoUser') === 'true';
}
