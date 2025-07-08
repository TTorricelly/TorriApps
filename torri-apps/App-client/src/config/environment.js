/**
 * Environment configuration for web app
 * Matches mobile app's environment.js patterns
 */

// Environment detection - matches mobile app logic
const getEnvironment = () => {
  // Check for explicit environment override first
  if (import.meta.env.VITE_API_ENV) {
    return import.meta.env.VITE_API_ENV;
  }
  
  // Check if we're in development mode
  if (import.meta.env.DEV) {
    return 'development';
  }
  
  // Default to production
  return 'production';
};

// Base URL configuration - matches mobile app patterns
const getApiBaseUrl = () => {
  const environment = getEnvironment();
  
  // In development, use empty string to leverage Vite proxy
  if (environment === 'development' && !import.meta.env.VITE_API_BASE_URL) {
    return ''; // This will use relative URLs that go through Vite proxy
  }
  
  // Check for explicit API URL override first (matches mobile's REACT_NATIVE_API_BASE_URL)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Environment-specific defaults
  switch (environment) {
    case 'development':
      return 'http://localhost:8000';
    case 'staging':
      return 'https://api-staging.torriapps.com';
    case 'production':
      return 'https://torri-backend-419996576894.us-central1.run.app';
    default:
      return 'https://torri-backend-419996576894.us-central1.run.app';
  }
};

export const ENVIRONMENT = getEnvironment();
export const API_BASE_URL = getApiBaseUrl();

// Log configuration in development
if (import.meta.env.DEV) {
    environment: ENVIRONMENT,
    apiBaseUrl: API_BASE_URL,
    isDev: import.meta.env.DEV,
    viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    willUseProxy: !import.meta.env.VITE_API_BASE_URL
  });
}