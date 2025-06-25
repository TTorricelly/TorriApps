/**
 * Phone number normalization utilities
 * Provides consistent phone number handling across the web application
 * Ported from mobile app for consistency
 */

/**
 * Normalizes phone numbers by removing all non-digit characters
 * 
 * @param {string} phone - The phone number to normalize
 * @returns {string} - Normalized phone number with only digits
 * 
 * @example
 * normalizePhoneNumber("(11) 99999-9999") // "11999999999"
 * normalizePhoneNumber("11 99999 9999") // "11999999999"
 * normalizePhoneNumber("+55 11 99999-9999") // "5511999999999"
 */
export const normalizePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Basic validation - phone should have at least 10 digits for most countries
  if (digitsOnly.length < 10) {
    return phone; // Return original if too short
  }
  
  return digitsOnly;
};

/**
 * Formats a normalized phone number for display
 * 
 * @param {string} phone - The normalized phone number (digits only)
 * @returns {string} - Formatted phone number for display
 * 
 * @example
 * formatPhoneForDisplay("11999999999") // "(11) 99999-9999"
 * formatPhoneForDisplay("5511999999999") // "+55 (11) 99999-9999"
 */
export const formatPhoneForDisplay = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return phone;
  }
  
  const digits = phone.replace(/\D/g, '');
  
  // Brazilian mobile format: 11 digits (with area code)
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  
  // Brazilian landline format: 10 digits (with area code)
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  
  // International format: more than 11 digits
  if (digits.length > 11) {
    const countryCode = digits.slice(0, -11);
    const areaCode = digits.slice(-11, -9);
    const number = digits.slice(-9);
    return `+${countryCode} (${areaCode}) ${number.slice(0, 5)}-${number.slice(5)}`;
  }
  
  return phone; // Return original if doesn't match expected patterns
};

/**
 * Validates if a phone number has a valid format
 * 
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  const normalized = normalizePhoneNumber(phone);
  
  // Brazilian phone numbers: 10 or 11 digits
  // International: 10-15 digits
  return normalized.length >= 10 && normalized.length <= 15;
};

/**
 * Determines if input is an email or phone number
 * 
 * @param {string} input - The input to check
 * @returns {'email' | 'phone' | 'unknown'} - Type of input
 */
export const getInputType = (input) => {
  if (!input || typeof input !== 'string') {
    return 'unknown';
  }
  
  if (input.includes('@')) {
    return 'email';
  }
  
  if (isValidPhoneNumber(input)) {
    return 'phone';
  }
  
  return 'unknown';
};

/**
 * Normalizes email or phone input appropriately
 * 
 * @param {string} input - Email or phone input
 * @returns {string} - Normalized input
 */
export const normalizeEmailOrPhone = (input) => {
  if (!input) return input;
  
  const inputType = getInputType(input);
  
  switch (inputType) {
    case 'email':
      return input.toLowerCase().trim();
    case 'phone':
      return normalizePhoneNumber(input);
    default:
      return input.trim();
  }
};