/**
 * Phone number normalization utilities for Web Admin
 * Provides consistent phone number handling across the admin application
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
 * Handles phone input change events with real-time formatting
 * Useful for controlled components in React forms
 * 
 * @param {string} value - The input value
 * @param {Function} setValue - State setter function
 * @param {Function} setNormalized - State setter for normalized value
 */
export const handlePhoneInputChange = (value, setValue, setNormalized = null) => {
  // Update display value
  setValue(value);
  
  // Update normalized value if setter provided
  if (setNormalized) {
    const normalized = normalizePhoneNumber(value);
    setNormalized(normalized);
  }
};

/**
 * Handles phone input blur events with formatting
 * Formats the phone number for better display when user finishes editing
 * 
 * @param {string} value - The current input value
 * @param {Function} setValue - State setter function
 */
export const handlePhoneInputBlur = (value, setValue) => {
  if (value && isValidPhoneNumber(value)) {
    const formatted = formatPhoneForDisplay(normalizePhoneNumber(value));
    setValue(formatted);
  }
};

/**
 * Prepares phone data for API submission
 * Ensures phone numbers are normalized before sending to backend
 * 
 * @param {Object} formData - The form data object
 * @param {string[]} phoneFields - Array of field names that contain phone numbers
 * @returns {Object} - Form data with normalized phone numbers
 */
export const preparePhoneDataForSubmission = (formData, phoneFields = ['phone_number', 'contact_phone', 'clientPhone']) => {
  const normalizedData = { ...formData };
  
  phoneFields.forEach(field => {
    if (normalizedData[field]) {
      normalizedData[field] = normalizePhoneNumber(normalizedData[field]);
    }
  });
  
  return normalizedData;
};

/**
 * Creates a phone input configuration object for form libraries
 * 
 * @param {string} fieldName - The field name
 * @param {string} placeholder - Placeholder text
 * @returns {Object} - Configuration object for phone inputs
 */
export const createPhoneInputConfig = (fieldName = 'phone_number', placeholder = '(11) 99999-9999') => ({
  name: fieldName,
  type: 'tel',
  placeholder,
  maxLength: 20,
  validation: {
    validate: (value) => {
      if (!value) return true; // Allow empty if not required
      return isValidPhoneNumber(value) || 'Número de telefone inválido';
    }
  }
});