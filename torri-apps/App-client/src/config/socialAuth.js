/**
 * Social Authentication Configuration
 * Configuration for Google and Facebook OAuth integration
 */

import { ENVIRONMENT } from './environment';

// Social auth configuration
export const SOCIAL_AUTH_CONFIG = {
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    scopes: ['email', 'profile'],
    // Redirect URIs for different environments
    redirectUri: ENVIRONMENT === 'development' 
      ? 'http://localhost:5173/auth/google/callback'
      : 'https://app.torriapps.com/auth/google/callback'
  },
  facebook: {
    appId: import.meta.env.VITE_FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID',
    scopes: ['email', 'public_profile', 'user_birthday', 'user_gender'],
    fields: 'id,name,email,picture.type(large),birthday,gender',
    version: 'v18.0'
  }
};

// Social auth endpoints configuration
export const SOCIAL_AUTH_ENDPOINTS = {
  google: {
    verify: '/api/v1/auth/google/verify',
    callback: '/api/v1/auth/google/callback'
  },
  facebook: {
    verify: '/api/v1/auth/facebook/verify',
    callback: '/api/v1/auth/facebook/callback'
  }
};

// Available social providers
export const SOCIAL_PROVIDERS = {
  GOOGLE: 'google',
  FACEBOOK: 'facebook'
};

// Helper function to get provider config
export const getSocialConfig = (provider) => {
  return SOCIAL_AUTH_CONFIG[provider] || null;
};

// Helper function to get provider endpoint
export const getSocialEndpoint = (provider, type) => {
  return SOCIAL_AUTH_ENDPOINTS[provider]?.[type] || null;
};

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('🔐 Social Auth Configuration:', {
    environment: ENVIRONMENT,
    googleClientId: SOCIAL_AUTH_CONFIG.google.clientId,
    facebookAppId: SOCIAL_AUTH_CONFIG.facebook.appId,
    hasGoogleEnv: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
    hasFacebookEnv: !!import.meta.env.VITE_FACEBOOK_APP_ID
  });
}