/**
 * URL Helper utilities for handling API and asset URLs in web application
 * Follows best practices for environment-aware URL handling
 * Ported from Mobile-client-core for exact business logic consistency
 */

import { API_BASE_URL } from '../config/environment';

/**
 * Get the base API URL from environment configuration
 * @returns {string} Base API URL
 */
export const getApiBaseUrl = () => {
  return API_BASE_URL || '';
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
  
  // In development, convert localhost URLs to relative paths for proxy
  if (import.meta.env.DEV && (assetPath.includes('localhost:8000') || assetPath.includes('127.0.0.1:8000'))) {
    // Extract the path part from localhost URL
    const url = new URL(assetPath);
    const relativePath = url.pathname;
    console.log(`[buildAssetUrl] Converting localhost URL to relative: "${assetPath}" → "${relativePath}"`);
    return relativePath;
  }
  
  // If already a complete URL (non-localhost), return as-is
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }
  
  const baseUrl = getApiBaseUrl();
  const cleanAssetPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  
  // Debug logging to see what URLs are being generated
  if (import.meta.env.DEV) {
    console.log(`[buildAssetUrl] Input: "${assetPath}" | BaseUrl: "${baseUrl}" | Output: "${!baseUrl ? cleanAssetPath : `${baseUrl.replace(/\/$/, '')}${cleanAssetPath}`}"`);
  }
  
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
export const processImageUrls = (data, imageFields = ['icon_url', 'image_url', 'photo_url', 'avatar_url', 'logo_url']) => {
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
        const originalUrl = processedData[field];
        const processedUrl = buildAssetUrl(processedData[field]);
        processedData[field] = processedUrl;
        
        if (import.meta.env.DEV && processedData.name) {
          console.log(`[urlHelpers] Field "${field}": "${originalUrl}" → "${processedUrl}"`);
        }
      }
    });
    
    return processedData;
  }
  
  return data;
};