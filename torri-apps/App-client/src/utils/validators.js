/**
 * Validation utilities for consistent validation across the web application
 * Combines validation logic from Shared utilities and Web-admin for consistency
 */

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^\+?[\d\s-()]+$/;
  return phoneRegex.test(phone);
};

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password meets minimum requirements
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 8;
};

/**
 * Validates required fields
 * @param {string} value - Value to validate
 * @returns {boolean} - True if value is not empty
 */
export const validateRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Validates minimum length
 * @param {string} value - Value to validate
 * @param {number} minLength - Minimum required length
 * @returns {boolean} - True if value meets minimum length
 */
export const validateMinLength = (value, minLength = 1) => {
  if (!value || typeof value !== 'string') return false;
  return value.trim().length >= minLength;
};

/**
 * Validates maximum length
 * @param {string} value - Value to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} - True if value doesn't exceed maximum length
 */
export const validateMaxLength = (value, maxLength = 255) => {
  if (!value || typeof value !== 'string') return true;
  return value.trim().length <= maxLength;
};

/**
 * Validates numeric value
 * @param {string|number} value - Value to validate
 * @returns {boolean} - True if value is a valid number
 */
export const validateNumeric = (value) => {
  if (value === null || value === undefined || value === '') return false;
  return !isNaN(Number(value));
};

/**
 * Validates positive number
 * @param {string|number} value - Value to validate
 * @returns {boolean} - True if value is a positive number
 */
export const validatePositiveNumber = (value) => {
  if (!validateNumeric(value)) return false;
  return Number(value) > 0;
};

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL format
 */
export const validateUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates date format (YYYY-MM-DD)
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if valid date format
 */
export const validateDate = (date) => {
  if (!date || typeof date !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime());
};

/**
 * Validates time format (HH:MM)
 * @param {string} time - Time string to validate
 * @returns {boolean} - True if valid time format
 */
export const validateTime = (time) => {
  if (!time || typeof time !== 'string') return false;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

/**
 * Validates Brazilian CPF format
 * @param {string} cpf - CPF to validate
 * @returns {boolean} - True if valid CPF format
 */
export const validateCPF = (cpf) => {
  if (!cpf || typeof cpf !== 'string') return false;
  
  // Remove non-digits
  const cleanCpf = cpf.replace(/\D/g, '');
  
  // Check length
  if (cleanCpf.length !== 11) return false;
  
  // Check for repeated digits
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(10))) return false;
  
  return true;
};

/**
 * Creates a validator function that combines multiple validation rules
 * @param {Object[]} rules - Array of validation rule objects
 * @returns {Function} - Validator function
 */
export const createValidator = (rules) => {
  return (value) => {
    for (const rule of rules) {
      const { validator, message } = rule;
      if (!validator(value)) {
        return { isValid: false, message };
      }
    }
    return { isValid: true, message: null };
  };
};