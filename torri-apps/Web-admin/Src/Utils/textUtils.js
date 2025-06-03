/**
 * Utility functions for handling text and HTML content
 */

/**
 * Strips HTML tags from a string and returns clean text
 * @param {string} html - HTML content to clean
 * @returns {string} - Clean text without HTML tags
 */
export const stripHtmlTags = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  // Create a temporary DOM element to parse HTML
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  
  // Get text content which automatically strips tags
  const textContent = tempElement.textContent || tempElement.innerText || '';
  
  // Clean up multiple spaces and line breaks
  return textContent.replace(/\s+/g, ' ').trim();
};

/**
 * Truncates text to a specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} - Truncated text with ellipsis if needed
 */
export const truncateText = (text, maxLength = 60) => {
  if (!text || typeof text !== 'string') return '';
  
  const cleanText = stripHtmlTags(text);
  return cleanText.length > maxLength 
    ? `${cleanText.substring(0, maxLength)}...`
    : cleanText;
};

/**
 * Converts HTML content to preview text for tables and cards
 * @param {string} html - HTML content
 * @param {number} maxLength - Maximum length for preview
 * @returns {string} - Clean preview text
 */
export const htmlToPreviewText = (html, maxLength = 60) => {
  return truncateText(html, maxLength);
};

/**
 * Sanitizes HTML content for safe display
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
export const sanitizeHtml = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  // Create a temporary element to parse and clean HTML
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  
  // Remove script tags and other potentially dangerous elements
  const scriptTags = tempElement.querySelectorAll('script');
  scriptTags.forEach(tag => tag.remove());
  
  // Remove event handlers
  const allElements = tempElement.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove all event attributes
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  
  return tempElement.innerHTML;
};

/**
 * Checks if a string contains HTML tags
 * @param {string} text - Text to check
 * @returns {boolean} - True if contains HTML tags
 */
export const containsHtml = (text) => {
  if (!text || typeof text !== 'string') return false;
  return /<[^>]*>/g.test(text);
};