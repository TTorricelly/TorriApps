/**
 * URL Helper utilities for handling API and asset URLs
 * Follows best practices for environment-aware URL handling
 */

/**
 * Get the base API URL from environment variables
 * @returns {string} Base API URL
 */
export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || '';
};

/**
 * Build a complete API URL
 * @param {string} endpoint - API endpoint (e.g., '/api/v1/categories')
 * @returns {string} Complete API URL
 */
export const buildApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If baseUrl is empty (development with proxy), return relative URL
  if (!baseUrl) {
    return cleanEndpoint;
  }
  
  // Remove trailing slash from baseUrl and ensure proper concatenation
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}${cleanEndpoint}`;
};

/**
 * Build a complete asset/upload URL
 * @param {string} assetPath - Asset path (e.g., '/uploads/image.jpg' or 'uploads/image.jpg')
 * @returns {string} Complete asset URL
 */
export const buildAssetUrl = (assetPath) => {
  if (!assetPath) return null;
  
  // If already a complete URL, return as-is for production
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    const baseUrl = getApiBaseUrl();
    
    // In development (empty baseUrl), convert absolute URLs to relative for proxy
    if (!baseUrl) {
      try {
        const url = new URL(assetPath);
        return url.pathname; // Return just the path part for proxy
      } catch {
        return assetPath; // Fallback if URL parsing fails
      }
    }
    
    return assetPath; // Production: use absolute URL as-is
  }
  
  const baseUrl = getApiBaseUrl();
  const cleanAssetPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  
  // If baseUrl is empty (development with proxy), return relative URL
  if (!baseUrl) {
    return cleanAssetPath;
  }
  
  // Remove trailing slash from baseUrl and ensure proper concatenation
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  return `${cleanBaseUrl}${cleanAssetPath}`;
};

/**
 * Process API response data to fix asset URLs
 * @param {Object|Array} data - API response data
 * @param {string[]} imageFields - Array of field names that contain image URLs
 * @returns {Object|Array} Data with fixed image URLs
 */
export const processImageUrls = (data, imageFields = ['icon_url', 'image_url', 'photo_url', 'avatar_url']) => {
  if (!data) return data;
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => processImageUrls(item, imageFields));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    const processedData = { ...data };
    
    imageFields.forEach(field => {
      if (processedData[field]) {
        processedData[field] = buildAssetUrl(processedData[field]);
      }
    });
    
    return processedData;
  }
  
  return data;
};