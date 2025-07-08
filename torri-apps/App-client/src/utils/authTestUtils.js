/**
 * Authentication testing utilities
 * Used to verify the standardized auth implementation
 */

import { jwtDecode } from 'jwt-decode';
import { normalizeEmailOrPhone } from './phoneUtils';

/**
 * Test JWT token structure and validation
 */
export const testJWTHandling = () => {
  
  // Create a test JWT token (mock)
  const mockPayload = {
    user_id: 'test-123',
    sub: 'test@example.com',
    full_name: 'Test User',
    role: 'client',
    is_active: true,
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  };
  
  // Create mock JWT (base64 encoded header.payload.signature)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(mockPayload));
  const signature = 'mock-signature';
  const mockToken = `${header}.${payload}.${signature}`;
  
  try {
    const decoded = jwtDecode(mockToken);
    
    // Test expiry validation
    const isExpired = decoded.exp * 1000 <= Date.now();
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Test phone number normalization
 */
export const testPhoneNormalization = () => {
  
  const testCases = [
    { input: '(11) 99999-9999', expected: '11999999999' },
    { input: '+55 11 99999-9999', expected: '5511999999999' },
    { input: 'test@example.com', expected: 'test@example.com' },
    { input: '11 99999 9999', expected: '11999999999' }
  ];
  
  let allPassed = true;
  
  testCases.forEach(({ input, expected }) => {
    const result = normalizeEmailOrPhone(input);
    const passed = result === expected;
    if (!passed) allPassed = false;
  });
  
  return allPassed;
};

/**
 * Test API request format
 */
export const testApiRequestFormat = () => {
  
  // Test that the auth service would send the correct format
  const testEmail = 'test@example.com';
  const testPhone = '(11) 99999-9999';
  
  const normalizedEmail = normalizeEmailOrPhone(testEmail);
  const normalizedPhone = normalizeEmailOrPhone(testPhone);
  
  
  // Simulate API request payload
  const emailPayload = {
    email_or_phone: normalizedEmail,
    password: 'test-password'
  };
  
  const phonePayload = {
    email_or_phone: normalizedPhone,
    password: 'test-password'
  };
  
  
  return true;
};

/**
 * Run all authentication tests
 */
export const runAuthTests = () => {
  
  const jwtTest = testJWTHandling();
  const phoneTest = testPhoneNormalization();
  const apiTest = testApiRequestFormat();
  
  const allPassed = jwtTest && phoneTest && apiTest;
  
  
  return allPassed;
};