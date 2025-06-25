/**
 * Theme utilities for managing PWA status bar and theme colors
 */

/**
 * Updates the theme color for PWA status bar
 * @param {string} color - Hex color code (e.g., '#ec4899')
 */
export const updateThemeColor = (color) => {
  // Update theme-color meta tags
  const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
  themeColorMetas.forEach(meta => {
    meta.setAttribute('content', color);
  });
  
  // Update body background for status bar area
  document.body.style.backgroundColor = color;
  
  console.log('🎨 Theme color updated to:', color);
};

/**
 * Predefined theme colors for different sections
 */
export const THEME_COLORS = {
  primary: '#ec4899',    // Pink (default/login)
  secondary: '#3b82f6',  // Blue 
  success: '#10b981',    // Green
  warning: '#f59e0b',    // Amber
  error: '#ef4444',      // Red
  dark: '#1f2937',       // Dark gray
  light: '#f3f4f6'       // Light gray
};

/**
 * Sets theme color for specific pages/sections
 * @param {string} section - Section name or color key
 */
export const setThemeForSection = (section) => {
  const color = THEME_COLORS[section] || THEME_COLORS.primary;
  updateThemeColor(color);
};

/**
 * Resets to default theme color
 */
export const resetTheme = () => {
  updateThemeColor(THEME_COLORS.primary);
};

/**
 * Gets current theme color
 * @returns {string} Current theme color
 */
export const getCurrentThemeColor = () => {
  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  return meta ? meta.getAttribute('content') : THEME_COLORS.primary;
};