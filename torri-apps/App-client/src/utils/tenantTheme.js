/**
 * Tenant theme customization utilities - Server-side implementation
 * Following best practices for multi-tenant theme management
 */

import { getTenantInfo } from '../shared/utils/tenant';
import { updateThemeColor } from './themeUtils';
import { fetchTenantTheme, saveTenantTheme as saveTenantThemeAPI, resetTenantTheme as resetTenantThemeAPI, fetchPublicTenantTheme } from '../api/themeApi';
import { getCachedTheme, setCachedTheme, clearAllThemeCaches, memoryCache } from './themeCache';

/**
 * Default theme configuration
 */
const DEFAULT_THEME = {
  primary: '#ec4899',    // Default pink
  primaryHover: '#db2777',
  primaryLight: '#f9a8d4',
  primaryDark: '#be185d',
};

/**
 * Theme validation schema
 */
const THEME_VALIDATION = {
  primary: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  primaryHover: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  primaryLight: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  primaryDark: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
};

/**
 * Validate theme configuration
 * @param {Object} theme - Theme configuration to validate
 * @returns {Object} Validated theme or default theme
 */
const validateTheme = (theme) => {
  if (!theme || typeof theme !== 'object') {
    return DEFAULT_THEME;
  }

  const validatedTheme = { ...DEFAULT_THEME };

  // Validate each color property
  Object.keys(THEME_VALIDATION).forEach(key => {
    if (theme[key] && THEME_VALIDATION[key].test(theme[key])) {
      validatedTheme[key] = theme[key];
    }
  });

  return validatedTheme;
};

/**
 * Get tenant-specific theme configuration with multi-layer caching
 * @param {boolean} bypassCache - Force fetch from server
 * @returns {Promise<Object>} Theme configuration object
 */
export const getTenantTheme = async (bypassCache = false) => {
  try {
    // 1. Check memory cache first (fastest)
    if (!bypassCache) {
      const memoryTheme = memoryCache.get();
      if (memoryTheme) {
        return memoryTheme;
      }
    }

    // 2. Check localStorage cache (fast)
    if (!bypassCache) {
      const cachedTheme = getCachedTheme();
      if (cachedTheme) {
        const validatedTheme = validateTheme(cachedTheme);
        memoryCache.set(validatedTheme);
        return validatedTheme;
      }
    }

    // 3. Fetch from server (slow but authoritative)
    const serverTheme = await fetchTenantTheme();
    
    if (serverTheme) {
      const validatedTheme = validateTheme(serverTheme);
      
      // Cache the validated theme
      setCachedTheme(validatedTheme);
      memoryCache.set(validatedTheme);
      
      return validatedTheme;
    }

    // 4. Fallback to default theme
    return DEFAULT_THEME;

  } catch (error) {
    return DEFAULT_THEME;
  }
};

/**
 * Save tenant theme configuration to server
 * @param {Object} themeConfig - Theme configuration object
 * @returns {Promise<boolean>} Success status
 */
export const saveTenantTheme = async (themeConfig) => {
  try {
    // Validate theme before saving
    const validatedTheme = validateTheme(themeConfig);
    
    // Save to server
    const success = await saveTenantThemeAPI(validatedTheme);
    
    if (success) {
      // Update caches
      setCachedTheme(validatedTheme);
      memoryCache.set(validatedTheme);
      
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Apply tenant theme to the application
 * @param {Object} customTheme - Optional custom theme override
 */
export const applyTenantTheme = async (customTheme = null) => {
  try {
    const theme = customTheme || await getTenantTheme();
    
    // Update CSS custom properties for dynamic theming
    const root = document.documentElement;
    
    // Set primary color variations
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-primary-hover', theme.primaryHover);
    root.style.setProperty('--color-primary-light', theme.primaryLight);
    root.style.setProperty('--color-primary-dark', theme.primaryDark);
    
    // Update PWA theme color
    updateThemeColor(theme.primary);
    
    // Update Tailwind primary color classes dynamically
    updateTailwindPrimaryColors(theme);
    
  } catch (error) {
    // Fallback to default theme
    applyTenantTheme(DEFAULT_THEME);
  }
};

/**
 * Preload tenant theme for faster initial render
 * @param {string} tenantId - Tenant identifier
 */
export const preloadTenantTheme = async (tenantId) => {
  try {
    // Fetch public theme (no auth required)
    const publicTheme = await fetchPublicTenantTheme(tenantId);
    
    if (publicTheme) {
      const validatedTheme = validateTheme(publicTheme);
      
      // Cache for later use
      setCachedTheme(validatedTheme);
      memoryCache.set(validatedTheme);
      
      // Apply immediately for faster perceived performance
      applyTenantTheme(validatedTheme);
      
      return validatedTheme;
    }
    
    return DEFAULT_THEME;
  } catch (error) {
    return DEFAULT_THEME;
  }
};

/**
 * Update Tailwind primary color classes dynamically
 * @param {Object} theme - Theme configuration
 */
const updateTailwindPrimaryColors = (theme) => {
  // Create or update style element
  let styleElement = document.getElementById('tenant-theme-override');
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'tenant-theme-override';
    document.head.appendChild(styleElement);
  }
  
  // Generate CSS to override Tailwind primary colors
  const css = `
    :root {
      --primary-50: ${lightenColor(theme.primary, 0.95)};
      --primary-100: ${lightenColor(theme.primary, 0.9)};
      --primary-200: ${lightenColor(theme.primary, 0.8)};
      --primary-300: ${lightenColor(theme.primary, 0.6)};
      --primary-400: ${lightenColor(theme.primary, 0.4)};
      --primary-500: ${theme.primary};
      --primary-600: ${theme.primaryHover};
      --primary-700: ${theme.primaryDark};
      --primary-800: ${darkenColor(theme.primary, 0.2)};
      --primary-900: ${darkenColor(theme.primary, 0.4)};
    }
    
    .bg-primary-50 { background-color: var(--primary-50) !important; }
    .bg-primary-100 { background-color: var(--primary-100) !important; }
    .bg-primary-200 { background-color: var(--primary-200) !important; }
    .bg-primary-300 { background-color: var(--primary-300) !important; }
    .bg-primary-400 { background-color: var(--primary-400) !important; }
    .bg-primary-500 { background-color: var(--primary-500) !important; }
    .bg-primary-600 { background-color: var(--primary-600) !important; }
    .bg-primary-700 { background-color: var(--primary-700) !important; }
    .bg-primary-800 { background-color: var(--primary-800) !important; }
    .bg-primary-900 { background-color: var(--primary-900) !important; }
    
    .text-primary-50 { color: var(--primary-50) !important; }
    .text-primary-100 { color: var(--primary-100) !important; }
    .text-primary-200 { color: var(--primary-200) !important; }
    .text-primary-300 { color: var(--primary-300) !important; }
    .text-primary-400 { color: var(--primary-400) !important; }
    .text-primary-500 { color: var(--primary-500) !important; }
    .text-primary-600 { color: var(--primary-600) !important; }
    .text-primary-700 { color: var(--primary-700) !important; }
    .text-primary-800 { color: var(--primary-800) !important; }
    .text-primary-900 { color: var(--primary-900) !important; }
    
    .border-primary-50 { border-color: var(--primary-50) !important; }
    .border-primary-100 { border-color: var(--primary-100) !important; }
    .border-primary-200 { border-color: var(--primary-200) !important; }
    .border-primary-300 { border-color: var(--primary-300) !important; }
    .border-primary-400 { border-color: var(--primary-400) !important; }
    .border-primary-500 { border-color: var(--primary-500) !important; }
    .border-primary-600 { border-color: var(--primary-600) !important; }
    .border-primary-700 { border-color: var(--primary-700) !important; }
    .border-primary-800 { border-color: var(--primary-800) !important; }
    .border-primary-900 { border-color: var(--primary-900) !important; }
    
    .hover\\:bg-primary-500:hover { background-color: var(--primary-500) !important; }
    .hover\\:bg-primary-600:hover { background-color: var(--primary-600) !important; }
    .hover\\:bg-primary-700:hover { background-color: var(--primary-700) !important; }
    .hover\\:text-primary-500:hover { color: var(--primary-500) !important; }
    .hover\\:text-primary-600:hover { color: var(--primary-600) !important; }
    .hover\\:border-primary-500:hover { border-color: var(--primary-500) !important; }
    .hover\\:border-primary-600:hover { border-color: var(--primary-600) !important; }
  `;
  
  styleElement.textContent = css;
};

/**
 * Reset tenant theme to default
 */
export const resetTenantTheme = async () => {
  try {
    // Reset on server
    const success = await resetTenantThemeAPI();
    
    if (success) {
      // Clear all caches
      clearAllThemeCaches();
      
      // Remove dynamic style overrides
      const styleElement = document.getElementById('tenant-theme-override');
      if (styleElement) {
        styleElement.remove();
      }
      
      // Apply default theme
      await applyTenantTheme(DEFAULT_THEME);
      
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Lighten a hex color by a percentage
 * @param {string} color - Hex color code
 * @param {number} percent - Percentage to lighten (0-1)
 * @returns {string} Lightened hex color
 */
const lightenColor = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent * 100);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

/**
 * Darken a hex color by a percentage
 * @param {string} color - Hex color code
 * @param {number} percent - Percentage to darken (0-1)
 * @returns {string} Darkened hex color
 */
const darkenColor = (color, percent) => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent * 100);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
    (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
    (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
};

/**
 * Get available theme presets
 * @returns {Object} Available theme presets
 */
export const getThemePresets = () => {
  return {
    pink: {
      name: 'Pink (Default)',
      primary: '#ec4899',
      primaryHover: '#db2777',
      primaryLight: '#f9a8d4',
      primaryDark: '#be185d',
    },
    blue: {
      name: 'Blue',
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryLight: '#93c5fd',
      primaryDark: '#1d4ed8',
    },
    green: {
      name: 'Green',
      primary: '#10b981',
      primaryHover: '#059669',
      primaryLight: '#6ee7b7',
      primaryDark: '#047857',
    },
    purple: {
      name: 'Purple',
      primary: '#8b5cf6',
      primaryHover: '#7c3aed',
      primaryLight: '#c4b5fd',
      primaryDark: '#6d28d9',
    },
    orange: {
      name: 'Orange',
      primary: '#f59e0b',
      primaryHover: '#d97706',
      primaryLight: '#fbbf24',
      primaryDark: '#b45309',
    },
    red: {
      name: 'Red',
      primary: '#ef4444',
      primaryHover: '#dc2626',
      primaryLight: '#f87171',
      primaryDark: '#b91c1c',
    },
    black: {
      name: 'Black',
      primary: '#1f2937',
      primaryHover: '#111827',
      primaryLight: '#6b7280',
      primaryDark: '#0f172a',
    },
  };
};