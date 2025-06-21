// Environment configuration for React Native
// This file handles environment-specific settings for different deployment targets

const developmentConfig = {
  // Priority: REACT_NATIVE_API_BASE_URL > Codespaces auto-detection > local default
  API_BASE_URL: process.env.REACT_NATIVE_API_BASE_URL ||
    (process.env.CODESPACE_NAME 
      ? `https://${process.env.CODESPACE_NAME}-8000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
      : 'https://upgraded-barnacle-wr95qvxv5gqh5457-8000.app.github.dev'), // Your Codespace URL
  ENVIRONMENT: 'development',
};

const stagingConfig = {
  API_BASE_URL: process.env.REACT_NATIVE_API_BASE_URL || 'https://api-staging.torriapps.com',
  ENVIRONMENT: 'staging',
};

const productionConfig = {
  API_BASE_URL: process.env.REACT_NATIVE_API_BASE_URL || 'https://api.torriapps.com',
  ENVIRONMENT: 'production',
};

// You can determine environment by:
// 1. __DEV__ flag (React Native built-in)
// 2. Custom environment variable
// 3. App bundle configuration

const getEnvironmentConfig = () => {
  // Check for custom environment variable first
  const customEnv = process.env.REACT_NATIVE_ENV;
  
  if (customEnv === 'staging') {
    return stagingConfig;
  }
  
  if (customEnv === 'production') {
    return productionConfig;
  }
  
  // Fallback to __DEV__ flag for development
  if (__DEV__) {
    return developmentConfig;
  }
  
  // Default to production when not in development
  return productionConfig;
};

const config = getEnvironmentConfig();

// Debug logging
console.log('Environment Config Debug:', {
  API_BASE_URL: config.API_BASE_URL,
  ENVIRONMENT: config.ENVIRONMENT,
  __DEV__: __DEV__,
  REACT_NATIVE_API_BASE_URL: process.env.REACT_NATIVE_API_BASE_URL,
  CODESPACE_NAME: process.env.CODESPACE_NAME,
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
});

export const API_BASE_URL = config.API_BASE_URL;
export const ENVIRONMENT = config.ENVIRONMENT;

export default config;