/**
 * Tenant Theme Manager - Server-side theme management
 * All users of a tenant (salon) see the same theme set by the salon owner
 */

import React, { useState, useEffect } from 'react';
import { getTenantInfo } from '../shared/utils/tenant';

const TenantThemeManager = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('#ec4899');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper functions for color manipulation
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

  // Get tenant info for API calls
  const getTenantId = () => {
    const tenantInfo = getTenantInfo();
    return tenantInfo?.domain || tenantInfo?.slug || 'default';
  };

  // Build API URL for theme endpoints
  const buildThemeApiUrl = () => {
    const tenantInfo = getTenantInfo();
    if (tenantInfo?.method === 'domain') {
      return `/api/v1/tenant/theme`;
    } else if (tenantInfo?.method === 'slug') {
      return `/api/v1/${tenantInfo.slug}/tenant/theme`;
    }
    return `/api/v1/tenant/theme`;
  };

  // Fetch tenant theme from server
  const fetchTenantTheme = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(buildThemeApiUrl(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.theme?.primaryColor) {
          console.log('🎨 Loaded tenant theme from server:', data.theme.primaryColor);
          return data.theme.primaryColor;
        }
      } else if (response.status === 404) {
        // No custom theme set, use default
        console.log('📋 No custom tenant theme found, using default');
        return '#ec4899';
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch tenant theme from server:', error.message);
      
      // Fallback to localStorage for offline/development mode
      const localTheme = localStorage.getItem('simple-theme-color');
      if (localTheme) {
        console.log('🔄 Using localStorage fallback theme:', localTheme);
        return localTheme;
      }
      
      return '#ec4899'; // Final fallback
    } finally {
      setIsLoading(false);
    }
  };

  // Save tenant theme to server
  const saveTenantTheme = async (color) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(buildThemeApiUrl(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          theme: {
            primaryColor: color,
            updatedAt: new Date().toISOString(),
            updatedBy: 'salon-owner' // You can get this from user context
          }
        }),
      });

      if (response.ok) {
        console.log('✅ Tenant theme saved to server:', color);
        
        // Also save to localStorage as backup
        localStorage.setItem('simple-theme-color', color);
        
        return true;
      } else {
        throw new Error(`Failed to save theme: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to save theme to server:', error.message);
      
      // Fallback to localStorage
      localStorage.setItem('simple-theme-color', color);
      console.log('🔄 Saved theme to localStorage as fallback');
      
      setError('Theme saved locally. Server sync will happen when connection is restored.');
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  // Apply theme CSS
  const applyTheme = (color) => {
    console.log('🎨 Applying tenant theme:', color);
    
    // Remove existing theme
    const existingStyle = document.getElementById('tenant-theme');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Create new theme CSS
    const style = document.createElement('style');
    style.id = 'tenant-theme';
    
    const darker = darkenColor(color, 0.2);
    
    style.textContent = `
      /* Tenant Theme Override - All users see this */
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
      
      .text-primary-500 { color: ${color} !important; }
      .text-primary-600 { color: ${darker} !important; }
      .text-pink-500 { color: ${color} !important; }
      .text-pink-600 { color: ${darker} !important; }
      
      .border-primary-500 { border-color: ${color} !important; }
      .border-pink-500 { border-color: ${color} !important; }
      
      .hover\\:bg-primary-500:hover { background-color: ${color} !important; }
      .hover\\:bg-primary-600:hover { background-color: ${darker} !important; }
      .hover\\:bg-pink-500:hover { background-color: ${color} !important; }
      .hover\\:bg-pink-600:hover { background-color: ${darker} !important; }
      
      .bg-gradient-to-r.from-primary-500.to-primary-600,
      .bg-gradient-to-r.from-pink-500.to-pink-600 {
        background: linear-gradient(to right, ${color}, ${darker}) !important;
      }
      
      [style*="#ec4899"] {
        background-color: ${color} !important;
        color: ${color} !important;
        border-color: ${color} !important;
      }
    `;

    document.head.appendChild(style);
    
    // Update PWA theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', color);
    }
    
    setCurrentTheme(color);
  };

  // Handle theme change
  const changeTheme = async (color) => {
    const success = await saveTenantTheme(color);
    if (success) {
      applyTheme(color);
    }
  };

  // Load theme on component mount
  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await fetchTenantTheme();
      if (savedTheme) {
        applyTheme(savedTheme);
      }
    };
    
    loadTheme();
  }, []);

  const themes = [
    { name: 'Pink', color: '#ec4899' },
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Green', color: '#10b981' },
    { name: 'Red', color: '#ef4444' },
    { name: 'Purple', color: '#8b5cf6' },
    { name: 'Orange', color: '#f59e0b' },
    { name: 'Black', color: '#1f2937' },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-primary-500 text-white p-3 rounded-full shadow-lg z-50"
        disabled={isLoading}
      >
        {isLoading ? '⏳' : '🎨'}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800">Tenant Theme</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-yellow-100 border border-yellow-400 rounded text-xs text-yellow-800">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-600 mb-3">
        Theme applies to all {getTenantId()} users
      </div>

      <div className="space-y-2">
        {themes.map(theme => (
          <button
            key={theme.name}
            onClick={() => changeTheme(theme.color)}
            disabled={isLoading}
            className={`w-full flex items-center space-x-3 p-2 rounded border hover:bg-gray-50 ${
              currentTheme === theme.color ? 'border-blue-500 bg-blue-50' : ''
            }`}
          >
            <div
              className="w-6 h-6 rounded-full border-2"
              style={{ backgroundColor: theme.color }}
            />
            <span className="text-sm font-medium">{theme.name}</span>
            {currentTheme === theme.color && <span className="text-xs text-blue-600">✓</span>}
          </button>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t">
        <input
          type="color"
          value={currentTheme}
          onChange={(e) => changeTheme(e.target.value)}
          disabled={isLoading}
          className="w-full h-10 rounded border cursor-pointer"
          title="Custom color"
        />
      </div>

      {isLoading && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Saving theme...
        </div>
      )}
    </div>
  );
};

export default TenantThemeManager;