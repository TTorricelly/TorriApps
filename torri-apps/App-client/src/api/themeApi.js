/**
 * Theme API utilities for server-side theme management
 * Following best practices for multi-tenant theme customization
 */

import { buildApiUrl } from '../shared/utils/tenant';

/**
 * Fetch tenant theme configuration from server using Settings API
 * @returns {Promise<Object>} Theme configuration
 */
export const fetchTenantTheme = async () => {
  try {
    // Get theme config from settings API
    const response = await fetch(`${buildApiUrl()}/api/v1/settings/theme_config`, {
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
      const { getTenantStorageKey } = await import('../shared/utils/tenant');
      const fallbackKey = getTenantStorageKey('theme_fallback');
      const storedTheme = localStorage.getItem(fallbackKey);
      return storedTheme ? JSON.parse(storedTheme) : null;
    } catch (fallbackError) {
      console.warn('Fallback storage also failed:', fallbackError);
      return null;
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
    // Save theme config as JSON string in settings
    const response = await fetch(`${buildApiUrl()}/api/v1/settings/theme_config`, {
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

    if (!response.ok) {
      throw new Error(`Failed to save theme: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.warn('⚠️ API not available, using fallback storage:', error.message);
    
    // FALLBACK: Use localStorage when API is not available
    try {
      const { getTenantStorageKey } = await import('../shared/utils/tenant');
      const fallbackKey = getTenantStorageKey('theme_fallback');
      localStorage.setItem(fallbackKey, JSON.stringify(themeConfig));
      console.log('✅ Theme saved to fallback storage');
      return true;
    } catch (fallbackError) {
      console.error('Fallback storage save failed:', fallbackError);
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
    const response = await fetch(`${buildApiUrl()}/api/v1/settings/theme_config`, {
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
      const { getTenantStorageKey } = await import('../shared/utils/tenant');
      const fallbackKey = getTenantStorageKey('theme_fallback');
      localStorage.removeItem(fallbackKey);
      console.log('✅ Theme reset using fallback storage');
      return true;
    } catch (fallbackError) {
      console.error('Fallback storage reset failed:', fallbackError);
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
    const response = await fetch(`${buildApiUrl()}/api/v1/settings/theme_config/public`, {
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
      const { getTenantStorageKey } = await import('../shared/utils/tenant');
      const fallbackKey = getTenantStorageKey('theme_fallback');
      const storedTheme = localStorage.getItem(fallbackKey);
      return storedTheme ? JSON.parse(storedTheme) : null;
    } catch (fallbackError) {
      console.warn('Public fallback storage failed:', fallbackError);
      return null;
    }
  }
};