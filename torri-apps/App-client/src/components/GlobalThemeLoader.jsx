/**
 * Global Theme Loader - Applies saved theme on app startup
 * This runs on every page to ensure theme persistence
 */

import React, { useEffect } from 'react';
import { fetchTenantTheme } from '../api/themeApi';

const GlobalThemeLoader = () => {
  // Helper functions (same as SimpleThemeChanger)
  const lightenColor = (color, factor) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.min(255, Math.round(r + (255 - r) * factor));
    const newG = Math.min(255, Math.round(g + (255 - g) * factor));
    const newB = Math.min(255, Math.round(b + (255 - b) * factor));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  const darkenColor = (color, factor) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const newR = Math.max(0, Math.round(r * (1 - factor)));
    const newG = Math.max(0, Math.round(g * (1 - factor)));
    const newB = Math.max(0, Math.round(b * (1 - factor)));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  // Apply theme function (simplified version of SimpleThemeChanger)
  const applyTheme = (color) => {
    
    // Remove any existing theme styles
    const existingStyle = document.getElementById('simple-theme');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Create comprehensive CSS override
    const style = document.createElement('style');
    style.id = 'simple-theme';
    
    const darker = darkenColor(color, 0.2);
    
    style.textContent = `
      /* Override ALL primary colors */
      .bg-primary-50 { background-color: ${lightenColor(color, 0.9)} !important; }
      .bg-primary-100 { background-color: ${lightenColor(color, 0.8)} !important; }
      .bg-primary-200 { background-color: ${lightenColor(color, 0.6)} !important; }
      .bg-primary-300 { background-color: ${lightenColor(color, 0.4)} !important; }
      .bg-primary-400 { background-color: ${lightenColor(color, 0.2)} !important; }
      .bg-primary-500 { background-color: ${color} !important; }
      .bg-primary-600 { background-color: ${darker} !important; }
      .bg-primary-700 { background-color: ${darkenColor(color, 0.3)} !important; }
      .bg-primary-800 { background-color: ${darkenColor(color, 0.4)} !important; }
      .bg-primary-900 { background-color: ${darkenColor(color, 0.5)} !important; }
      
      /* Override ALL pink colors */
      .bg-pink-50 { background-color: ${lightenColor(color, 0.9)} !important; }
      .bg-pink-100 { background-color: ${lightenColor(color, 0.8)} !important; }
      .bg-pink-200 { background-color: ${lightenColor(color, 0.6)} !important; }
      .bg-pink-300 { background-color: ${lightenColor(color, 0.4)} !important; }
      .bg-pink-400 { background-color: ${lightenColor(color, 0.2)} !important; }
      .bg-pink-500 { background-color: ${color} !important; }
      .bg-pink-600 { background-color: ${darker} !important; }
      .bg-pink-700 { background-color: ${darkenColor(color, 0.3)} !important; }
      .bg-pink-800 { background-color: ${darkenColor(color, 0.4)} !important; }
      .bg-pink-900 { background-color: ${darkenColor(color, 0.5)} !important; }
      
      /* Text colors */
      .text-primary-500 { color: ${color} !important; }
      .text-primary-600 { color: ${darker} !important; }
      .text-pink-500 { color: ${color} !important; }
      .text-pink-600 { color: ${darker} !important; }
      
      /* Border colors */
      .border-primary-500 { border-color: ${color} !important; }
      .border-pink-500 { border-color: ${color} !important; }
      
      /* Hover states */
      .hover\\:bg-primary-500:hover { background-color: ${color} !important; }
      .hover\\:bg-primary-600:hover { background-color: ${darker} !important; }
      .hover\\:bg-pink-500:hover { background-color: ${color} !important; }
      .hover\\:bg-pink-600:hover { background-color: ${darker} !important; }
      
      /* Force override any inline styles with the old pink color */
      [style*="#ec4899"] {
        background-color: ${color} !important;
        color: ${color} !important;
        border-color: ${color} !important;
      }
      
      /* SUPER AGGRESSIVE: Override ALL possible pink backgrounds */
      div[style*="background-color: #ec4899"],
      div[style*="backgroundColor: #ec4899"],
      div[style*="background:#ec4899"],
      *[style*="#ec4899"] {
        background-color: ${color} !important;
        background: ${color} !important;
      }
      
      /* Fix gradients specifically */
      .bg-gradient-to-r.from-primary-500.to-primary-600,
      .bg-gradient-to-r.from-pink-500.to-pink-600 {
        background: linear-gradient(to right, ${color}, ${darker}) !important;
      }
      
      .from-primary-500,
      .from-pink-500 {
        --tw-gradient-from: ${color} !important;
        --tw-gradient-to: ${color} !important;
      }
      
      .to-primary-600,
      .to-pink-600 {
        --tw-gradient-to: ${darker} !important;
      }
    `;

    document.head.appendChild(style);
    
    // Update meta theme color for PWA
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }
    
  };

  // Apply saved theme on mount - try server first, then localStorage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Try to get theme from server first
        const serverTheme = await fetchTenantTheme();
        if (serverTheme?.primary || serverTheme?.primaryColor) {
          const themeColor = serverTheme.primary || serverTheme.primaryColor;
          applyTheme(themeColor);
          // Cache in localStorage for fast access
          localStorage.setItem('simple-theme-color', themeColor);
          return;
        }
      } catch (error) {
        // Ignore server theme fetch errors - fallback to localStorage
      }
      
      // Fallback to localStorage
      const saved = localStorage.getItem('simple-theme-color');
      if (saved) {
        applyTheme(saved);
      }
    };
    
    loadTheme();
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default GlobalThemeLoader;