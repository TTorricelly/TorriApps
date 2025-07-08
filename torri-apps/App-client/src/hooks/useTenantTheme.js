/**
 * Custom hook for managing tenant theme customization
 */

import { useState, useEffect } from 'react';
import { 
  getTenantTheme, 
  saveTenantTheme, 
  applyTenantTheme, 
  resetTenantTheme,
  getThemePresets 
} from '../utils/tenantTheme';

export const useTenantTheme = () => {
  const [currentTheme, setCurrentTheme] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [presets] = useState(getThemePresets());

  // Load current theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const theme = await getTenantTheme();
        setCurrentTheme(theme);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  /**
   * Update theme with new configuration
   * @param {Object} newTheme - New theme configuration
   */
  const updateTheme = async (newTheme) => {
    try {
      setIsLoading(true);
      
      // Save theme configuration
      const success = await saveTenantTheme(newTheme);
      
      if (success) {
        // Apply theme immediately
        await applyTenantTheme(newTheme);
        
        // Update local state
        setCurrentTheme({ ...currentTheme, ...newTheme });
        
      } else {
        throw new Error('Failed to save theme to server');
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Apply a theme preset
   * @param {string} presetKey - Key of the preset to apply
   */
  const applyPreset = async (presetKey) => {
    
    const preset = presets[presetKey];
    if (!preset) {
      return;
    }

    const { name, ...themeConfig } = preset;
    
    await updateTheme(themeConfig);
  };

  /**
   * Reset theme to default
   */
  const resetTheme = async () => {
    try {
      setIsLoading(true);
      
      // Reset theme storage and application
      const success = await resetTenantTheme();
      
      if (success) {
        // Reload current theme
        const theme = await getTenantTheme(true); // Bypass cache
        setCurrentTheme(theme);
        
      } else {
        throw new Error('Failed to reset theme on server');
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update just the primary color
   * @param {string} color - New primary color
   */
  const updatePrimaryColor = async (color) => {
    // Generate complementary colors based on primary
    const primaryHover = darkenColor(color, 0.1);
    const primaryLight = lightenColor(color, 0.3);
    const primaryDark = darkenColor(color, 0.2);

    await updateTheme({
      primary: color,
      primaryHover,
      primaryLight,
      primaryDark,
    });
  };

  return {
    currentTheme,
    isLoading,
    presets,
    updateTheme,
    applyPreset,
    resetTheme,
    updatePrimaryColor,
  };
};

/**
 * Helper function to lighten a color
 * @param {string} color - Hex color
 * @param {number} factor - Lightening factor (0-1)
 * @returns {string} Lightened color
 */
const lightenColor = (color, factor) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

/**
 * Helper function to darken a color
 * @param {string} color - Hex color
 * @param {number} factor - Darkening factor (0-1)
 * @returns {string} Darkened color
 */
const darkenColor = (color, factor) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const newR = Math.round(r * (1 - factor));
  const newG = Math.round(g * (1 - factor));
  const newB = Math.round(b * (1 - factor));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};