// Environment configuration for React Native
// This file handles environment-specific settings for different deployment targets

const developmentConfig = {
  // Use IP address for physical devices, localhost for simulators
  // If you need to switch back to localhost for simulator, change this to 'localhost'
  API_BASE_URL: 'http://192.168.1.7:8000', // Use laptop's IP for physical device testing
  ENVIRONMENT: 'development',
};

const stagingConfig = {
  API_BASE_URL: 'https://api-staging.torriapps.com', // Replace with your actual staging URL
  ENVIRONMENT: 'staging',
};

const productionConfig = {
  API_BASE_URL: 'https://api.torriapps.com', // Replace with your actual production URL
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

export const API_BASE_URL = config.API_BASE_URL;
export const ENVIRONMENT = config.ENVIRONMENT;

export default config;