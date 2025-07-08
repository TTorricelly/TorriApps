/**
 * Theme API utilities for server-side theme management
 * Following best practices for multi-tenant theme customization
 */

import { buildApiEndpoint, getTenantInfo } from '../utils/apiHelpers';

/**
 * Fetch tenant theme configuration from server using Settings API
 * @returns {Promise<Object>} Theme configuration
 */
export const fetchTenantTheme = async () => {
  try {
    // Debug tenant info
    const tenantInfo = getTenantInfo();
    console.log('🏢 Current tenant info:', tenantInfo);
    
    // Get theme config from settings API - theme_config is the key parameter
    const apiUrl = buildApiEndpoint('settings/theme_config');
    console.log('🔍 Fetching theme from URL:', apiUrl);
    console.log('🌐 Full URL being called:', window.location.origin + apiUrl);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No custom theme set, return null to use default
        return null;
      }
      throw new Error(`Failed to fetch theme: ${response.status}`);
    }

    const data = await response.json();
    // Parse JSON string value from settings
    return data.value ? JSON.parse(data.value) : null;
  } catch (error) {
    console.warn('⚠️ API not available, using fallback storage:', error.message);
    
    // FALLBACK: Use localStorage when API is not available
    try {
      const tenantInfo = getTenantInfo();
      const identifier = tenantInfo?.domain || tenantInfo?.slug || 'default';
      const fallbackKey = `${identifier}_theme_fallback`;
      const storedTheme = localStorage.getItem(fallbackKey);
      return storedTheme ? JSON.parse(storedTheme) : null;
    } catch (fallbackError) {
      console.warn('Fallback storage also failed:', fallbackError);
      return localStorage.getItem('simple-theme-color') || '#ec4899';
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
    console.log('🏢 Current tenant info:', tenantInfo);
    
    // Save theme config as JSON string in settings using correct tenant-scoped endpoint
    const apiUrl = buildApiEndpoint('settings/theme_config');
    console.log('🔍 Saving theme to URL:', apiUrl);
    console.log('📝 Theme config:', themeConfig);
    
    // Try to update existing setting first
    let response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ 
        value: JSON.stringify(themeConfig),
        data_type: 'string',
        description: 'Theme configuration JSON'
      }),
    });

    // If setting doesn't exist (404), create it
    if (response.status === 404) {
      console.log('⚠️ Theme setting not found, creating new one...');
      const createUrl = buildApiEndpoint('settings');
      response = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ 
          key: 'theme_config',
          value: JSON.stringify(themeConfig),
          data_type: 'string',
          description: 'Theme configuration JSON'
        }),
      });
    }

    if (!response.ok) {
      throw new Error(`Failed to save theme: ${response.status}`);
    }

    console.log('✅ Theme saved successfully');
    return true;
  } catch (error) {
    console.warn('⚠️ API not available, using fallback storage:', error.message);
    
    // FALLBACK: Use localStorage when API is not available
    try {
      const tenantInfo = getTenantInfo();
      const identifier = tenantInfo?.domain || tenantInfo?.slug || 'default';
      const fallbackKey = `${identifier}_theme_fallback`;
      localStorage.setItem(fallbackKey, JSON.stringify(themeConfig));
      console.log('✅ Theme saved to fallback storage');
      return true;
    } catch (fallbackError) {
      console.error('Fallback storage save failed:', fallbackError);
      // Last resort - use simple localStorage
      localStorage.setItem('simple-theme-color', themeConfig.primaryColor);
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
    const response = await fetch(buildApiEndpoint('settings/theme_config'), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to reset theme: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.warn('⚠️ API not available, using fallback storage:', error.message);
    
    // FALLBACK: Clear localStorage when API is not available
    try {
      const tenantInfo = getTenantInfo();
      const identifier = tenantInfo?.domain || tenantInfo?.slug || 'default';
      const fallbackKey = `${identifier}_theme_fallback`;
      localStorage.removeItem(fallbackKey);
      localStorage.removeItem('simple-theme-color');
      console.log('✅ Theme reset using fallback storage');
      return true;
    } catch (fallbackError) {
      console.error('Fallback storage reset failed:', fallbackError);
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
    const response = await fetch(buildApiEndpoint('settings/theme_config/public', 'v1', { isPublic: true }), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch public theme: ${response.status}`);
    }

    const data = await response.json();
    return data.value ? JSON.parse(data.value) : null;
  } catch (error) {
    console.warn('⚠️ Public API not available, using fallback storage:', error.message);
    
    // FALLBACK: Use localStorage for public theme
    try {
      const fallbackKey = `${tenantId}_theme_fallback`;
      const storedTheme = localStorage.getItem(fallbackKey);
      return storedTheme ? JSON.parse(storedTheme) : null;
    } catch (fallbackError) {
      console.warn('Public fallback storage failed:', fallbackError);
      return localStorage.getItem('simple-theme-color') || null;
    }
  }
};