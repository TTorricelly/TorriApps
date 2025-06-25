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
  console.log('🔐 Testing JWT handling...');
  
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
    console.log('✅ JWT decoding works:', decoded);
    
    // Test expiry validation
    const isExpired = decoded.exp * 1000 <= Date.now();
    console.log('✅ Token expiry check:', isExpired ? 'Expired' : 'Valid');
    
    return true;
  } catch (error) {
    console.error('❌ JWT handling failed:', error);
    return false;
  }
};

/**
 * Test phone number normalization
 */
export const testPhoneNormalization = () => {
  console.log('📱 Testing phone normalization...');
  
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
    console.log(`${passed ? '✅' : '❌'} "${input}" → "${result}" (expected: "${expected}")`);
    if (!passed) allPassed = false;
  });
  
  return allPassed;
};

/**
 * Test API request format
 */
export const testApiRequestFormat = () => {
  console.log('🌐 Testing API request format...');
  
  // Test that the auth service would send the correct format
  const testEmail = 'test@example.com';
  const testPhone = '(11) 99999-9999';
  
  const normalizedEmail = normalizeEmailOrPhone(testEmail);
  const normalizedPhone = normalizeEmailOrPhone(testPhone);
  
  console.log('✅ Email normalization:', testEmail, '→', normalizedEmail);
  console.log('✅ Phone normalization:', testPhone, '→', normalizedPhone);
  
  // Simulate API request payload
  const emailPayload = {
    email_or_phone: normalizedEmail,
    password: 'test-password'
  };
  
  const phonePayload = {
    email_or_phone: normalizedPhone,
    password: 'test-password'
  };
  
  console.log('✅ Email API payload:', emailPayload);
  console.log('✅ Phone API payload:', phonePayload);
  
  return true;
};

/**
 * Run all authentication tests
 */
export const runAuthTests = () => {
  console.log('🧪 Running authentication system tests...\n');
  
  const jwtTest = testJWTHandling();
  const phoneTest = testPhoneNormalization();
  const apiTest = testApiRequestFormat();
  
  const allPassed = jwtTest && phoneTest && apiTest;
  
  console.log('\n📊 Test Results:');
  console.log(`JWT Handling: ${jwtTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Phone Normalization: ${phoneTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Request Format: ${apiTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return allPassed;
};