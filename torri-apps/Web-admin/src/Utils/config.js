/**
 * Centralized configuration for environment-specific settings
 */

// Get the API base URL from environment variables
const getApiBaseUrl = () => {
  // Priority order: VITE_API_BASE_URL > VITE_API_URL > empty for proxy
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 
                  import.meta.env.VITE_API_URL || 
                  ''; // Empty string for Vite proxy in development
  
  // Remove trailing slash if present
  return baseUrl.replace(/\/$/, '');
};

// Get the full URL for static assets (images, files, etc.)
export const getAssetUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path; // Already a full URL
  }
  
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

// Environment detection
export const isDevelopment = () => import.meta.env.MODE === 'development';
export const isProduction = () => import.meta.env.MODE === 'production';

// API configuration
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  TIMEOUT: 30000, // 30 seconds
  ENDPOINTS: {
    AUTH: '/auth',
    SERVICES: '/services',
    CATEGORIES: '/categories',
    PROFESSIONALS: '/professionals',
    CLIENTS: '/clients',
    APPOINTMENTS: '/appointments',
    STATIONS: '/stations',
    SETTINGS: '/settings',
  }
};

// Auto-detect Codespaces environment
export const isCodespaces = () => {
  return Boolean(process.env.CODESPACE_NAME || process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN);
};

// Generate Codespaces URL for a specific port
export const getCodespacesUrl = (port = 8000) => {
  const codespaceName = process.env.CODESPACE_NAME;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  
  if (codespaceName && domain) {
    return `https://${codespaceName}-${port}.${domain}`;
  }
  
  return null;
};

export default {
  API_CONFIG,
  getAssetUrl,
  isDevelopment,
  isProduction,
  isCodespaces,
  getCodespacesUrl
};