/**
 * Utility functions for label operations
 */

/**
 * Calculate text color based on background color contrast
 * @param {string} backgroundColor - Hex color code
 * @returns {string} - Text color (#000000 or #ffffff)
 */
export const getContrastTextColor = (backgroundColor) => {
  // Validate and sanitize hex color
  if (!backgroundColor || typeof backgroundColor !== 'string') {
    return '#000000'; // Default to black text
  }
  
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  
  // Validate hex format (3 or 6 characters)
  if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(hex)) {
    return '#000000'; // Default to black text
  }
  
  // Convert 3-char hex to 6-char
  const fullHex = hex.length === 3 
    ? hex.split('').map(char => char + char).join('')
    : hex;
  
  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  
  // Calculate luminance using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, dark for light backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

/**
 * Compare two label arrays by their IDs
 * @param {Array} labels1 - First label array
 * @param {Array} labels2 - Second label array
 * @returns {boolean} - Whether the arrays have the same label IDs
 */
export const areLabelsEqual = (labels1 = [], labels2 = []) => {
  const ids1 = labels1.filter(l => l && l.id).map(l => l.id).sort();
  const ids2 = labels2.filter(l => l && l.id).map(l => l.id).sort();
  return JSON.stringify(ids1) === JSON.stringify(ids2);
};

/**
 * Extract valid label IDs from a label array
 * @param {Array} labels - Array of label objects
 * @returns {Array} - Array of valid label IDs
 */
export const extractLabelIds = (labels = []) => {
  return labels
    .filter(label => label && label.id)
    .map(label => label.id);
};

/**
 * Validate label object structure
 * @param {Object} label - Label object to validate
 * @returns {boolean} - Whether the label is valid
 */
export const isValidLabel = (label) => {
  return label && 
         typeof label === 'object' &&
         label.id &&
         label.name &&
         typeof label.name === 'string';
};

/**
 * Default label colors for new labels
 */
export const DEFAULT_LABEL_COLORS = [
  '#00BFFF', // Deep Sky Blue
  '#FF6B6B', // Light Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
  '#F8C471'  // Light Orange
];