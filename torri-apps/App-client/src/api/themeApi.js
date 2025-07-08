/**
 * Theme API utilities for server-side theme management
 * Following best practices for multi-tenant theme customization
 */

import { buildApiEndpoint, getTenantInfo } from '../utils/apiHelpers';
import apiClient from '../config/api';

/**
 * Fetch tenant theme configuration from server using Settings API
 * @returns {Promise<Object>} Theme configuration
 */
export const fetchTenantTheme = async () => {
  try {
    // Debug tenant info
    const tenantInfo = getTenantInfo();
    
    // Get theme config from settings API - theme_config is the key parameter
    const apiUrl = buildApiEndpoint('settings/theme_config');
    
    const response = await apiClient.get(apiUrl);
    const data = response.data;
    
    // Parse JSON string value from settings
    return data.value ? JSON.parse(data.value) : null;
  } catch (error) {
    
    // FALLBACK: Use localStorage when API is not available
    try {
      const tenantInfo = getTenantInfo();
      const identifier = tenantInfo?.domain || tenantInfo?.slug || 'default';
      const fallbackKey = `${identifier}_theme_fallback`;
      const storedTheme = localStorage.getItem(fallbackKey);
      return storedTheme ? JSON.parse(storedTheme) : null;
    } catch (fallbackError) {
      const simpleTheme = localStorage.getItem('simple-theme-color');
      return simpleTheme ? { primary: simpleTheme } : null;
    }
  }
};

/**
 * Save tenant theme configuration to server using Settings API
 * @param {Object} themeConfig - Theme configuration object
 * @returns {Promise<boolean>} Success status
 */
export const saveTenantTheme = async (themeConfig) => {
  try {
    // Debug tenant info
    const tenantInfo = getTenantInfo();
    
    // Save theme config as JSON string in settings using correct tenant-scoped endpoint
    const apiUrl = buildApiEndpoint('settings/theme_config');
    
    // Try to update existing setting first
    try {
      await apiClient.put(apiUrl, { 
        value: JSON.stringify(themeConfig),
        data_type: 'string',
        description: 'Theme configuration JSON'
      });
    } catch (error) {
      // If setting doesn't exist (404), create it
      if (error.response?.status === 404) {
        const createUrl = buildApiEndpoint('settings');
        await apiClient.post(createUrl, { 
          key: 'theme_config',
          value: JSON.stringify(themeConfig),
          data_type: 'string',
          description: 'Theme configuration JSON'
        });
      } else {
        throw error;
      }
    }

    return true;
  } catch (error) {
    
    // FALLBACK: Use localStorage when API is not available
    try {
      const tenantInfo = getTenantInfo();
      const identifier = tenantInfo?.domain || tenantInfo?.slug || 'default';
      const fallbackKey = `${identifier}_theme_fallback`;
      localStorage.setItem(fallbackKey, JSON.stringify(themeConfig));
      return true;
    } catch (fallbackError) {
      // Last resort - use simple localStorage
      localStorage.setItem('simple-theme-color', themeConfig.primary || themeConfig.primaryColor);
      return false;
    }
  }
};

/**
 * Reset tenant theme to default (delete custom theme setting)
 * @returns {Promise<boolean>} Success status
 */
export const resetTenantTheme = async () => {
  try {
    await apiClient.delete(buildApiEndpoint('settings/theme_config'));
    return true;
  } catch (error) {
    
    // FALLBACK: Clear localStorage when API is not available
    try {
      const tenantInfo = getTenantInfo();
      const identifier = tenantInfo?.domain || tenantInfo?.slug || 'default';
      const fallbackKey = `${identifier}_theme_fallback`;
      localStorage.removeItem(fallbackKey);
      localStorage.removeItem('simple-theme-color');
      return true;
    } catch (fallbackError) {
      localStorage.removeItem('simple-theme-color');
      return false;
    }
  }
};

/**
 * Get public tenant theme (no authentication required)
 * Used for initial theme loading before user authentication
 * @param {string} tenantId - Tenant identifier
 * @returns {Promise<Object>} Theme configuration
 */
export const fetchPublicTenantTheme = async (tenantId) => {
  try {
    const response = await apiClient.get(buildApiEndpoint('settings/theme_config/public', 'v1', { isPublic: true }), {
      headers: {
        'X-Tenant-ID': tenantId,
      },
    });

    const data = response.data;
    return data.value ? JSON.parse(data.value) : null;
  } catch (error) {
    
    // FALLBACK: Use localStorage for public theme
    try {
      const fallbackKey = `${tenantId}_theme_fallback`;
      const storedTheme = localStorage.getItem(fallbackKey);
      return storedTheme ? JSON.parse(storedTheme) : null;
    } catch (fallbackError) {
      const simpleTheme = localStorage.getItem('simple-theme-color');
      return simpleTheme ? { primary: simpleTheme } : null;
    }
  }
};