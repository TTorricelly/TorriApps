/**
 * SIMPLE Theme Changer - No complexity, just works
 */

import React, { useState } from 'react';
import { saveTenantTheme, fetchTenantTheme } from '../api/themeApi';

const SimpleThemeChanger = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Helper functions (defined first)
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

  // Function that changes colors and saves to server
  const changeTheme = async (color) => {
    
    // Save to server first (and localStorage as fallback)
    try {
      const themeConfig = {
        primaryColor: color,
        secondaryColor: darkenColor(color, 0.1),
        accentColor: lightenColor(color, 0.2)
      };
      
      await saveTenantTheme(themeConfig);
    } catch (error) {
      localStorage.setItem('simple-theme-color', color);
    }
    
    // Remove any existing theme styles
    const existingStyle = document.getElementById('simple-theme');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Create comprehensive CSS override
    const style = document.createElement('style');
    style.id = 'simple-theme';
    
    // Generate lighter and darker variations
    const lighter = lightenColor(color, 0.3);
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
      
      /* Override ALL pink colors (the actual problem!) */
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
      
      /* CSS Custom Properties for inline styles */
      :root {
        --color-primary: ${color} !important;
        --primary-color: ${color} !important;
        --theme-color: ${color} !important;
      }
      
      /* Override hard-coded hex colors in CSS */
      * {
        --tw-bg-opacity: 1 !important;
      }
      
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
      
      /* Only target elements that are actually pink - be more specific */
      
      /* Nuclear option: Override any RGB equivalent of #ec4899 */
      *[style*="236, 72, 153"],
      *[style*="rgb(236, 72, 153)"],
      *[style*="rgba(236, 72, 153"] {
        background-color: ${color} !important;
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
    
    // Save to localStorage
    localStorage.setItem('simple-theme-color', color);
    
    // CRITICAL: Fix inline styles directly in the DOM
    // This handles hard-coded backgroundColor: '#ec4899' in HomePage
    const fixInlineStyles = () => {
      
      // Method 1: Find elements by style attribute
      const elementsWithStyle = document.querySelectorAll('*[style]');
      let fixedCount = 0;
      
      elementsWithStyle.forEach(el => {
        const style = el.getAttribute('style');
        if (style && style.includes('#ec4899')) {
          // Replace the hardcoded pink with new color
          const newStyle = style.replace(/#ec4899/g, color);
          el.setAttribute('style', newStyle);
          fixedCount++;
        }
      });
      
      // Method 2: Find elements by computed style (only check specific areas)
      const headerElements = document.querySelectorAll('header, .header, .safe-area-top, nav, .nav');
      headerElements.forEach(el => {
        try {
          const computed = window.getComputedStyle(el);
          if (computed.backgroundColor === 'rgb(236, 72, 153)' || 
              computed.backgroundColor === '#ec4899') {
            el.style.setProperty('background-color', color, 'important');
            fixedCount++;
          }
        } catch (e) {
          // Ignore errors from pseudo-elements
        }
      });
      
      // Method 3: Only target elements that should actually be pink
      const pinkTargets = [
        '.bg-pink-500',
        '.bg-pink-600', 
        '.bg-pink-400',
        '.bg-pink-700',
        '.from-pink-500',
        '.to-pink-600',
        '.from-primary-500',
        '.to-primary-600'
      ];
      
      pinkTargets.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (selector.includes('from-') || selector.includes('to-')) {
              // Handle gradient elements
              el.style.setProperty('background', `linear-gradient(to right, ${color}, ${darkenColor(color, 0.2)})`, 'important');
            } else {
              el.style.setProperty('background-color', color, 'important');
            }
            fixedCount++;
          });
        } catch (e) {
        }
      });
      
      // Method 5: Specifically target professional dashboard header
      const professionalHeader = document.querySelector('.safe-area-top.bg-gradient-to-r');
      if (professionalHeader) {
        professionalHeader.style.setProperty('background', `linear-gradient(to right, ${color}, ${darkenColor(color, 0.2)})`, 'important');
        fixedCount++;
      }
      
      // Method 4: Only target inline styles that are ACTUALLY pink
      const inlineStyleElements = document.querySelectorAll('*[style]');
      inlineStyleElements.forEach(el => {
        const style = el.getAttribute('style');
        if (style && (
          style.includes('backgroundColor: #ec4899') ||
          style.includes('background-color: #ec4899') ||
          style.includes('background: #ec4899')
        )) {
          el.style.setProperty('background-color', color, 'important');
          fixedCount++;
        }
      });
      
    };
    
    // Apply immediately
    fixInlineStyles();
    
    // Apply repeatedly for stubborn React components
    setTimeout(fixInlineStyles, 100);
    setTimeout(fixInlineStyles, 500);
    setTimeout(fixInlineStyles, 1000);
    
    // Clean up old observer
    if (window.themeObserver) {
      window.themeObserver.disconnect();
    }
    
    // Also watch for dynamically added elements (React re-renders)
    const observer = new MutationObserver((mutations) => {
      let shouldFix = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldFix = true;
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const style = mutation.target.getAttribute('style');
          if (style && style.includes('#ec4899')) {
            shouldFix = true;
          }
        }
      });
      
      if (shouldFix) {
        setTimeout(fixInlineStyles, 50);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });
    
    // Store observer for cleanup
    window.themeObserver = observer;
    
    // Also set up interval to persistently override React
    if (window.themeInterval) {
      clearInterval(window.themeInterval);
    }
    window.themeInterval = setInterval(fixInlineStyles, 2000);
    
    
    // Force a repaint
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
  };


  // Load saved theme on mount and apply it immediately
  React.useEffect(() => {
    const saved = localStorage.getItem('simple-theme-color');
    if (saved) {
      changeTheme(saved);
    }
  }, []);

  // Also apply theme immediately when component mounts (before useEffect)
  React.useMemo(() => {
    const saved = localStorage.getItem('simple-theme-color');
    if (saved) {
      // Apply theme synchronously
      setTimeout(() => changeTheme(saved), 0);
    }
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
      >
        🎨
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-800">Simple Theme</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2">
        {themes.map(theme => (
          <button
            key={theme.name}
            onClick={() => changeTheme(theme.color)}
            className="w-full flex items-center space-x-3 p-2 rounded border hover:bg-gray-50"
          >
            <div
              className="w-6 h-6 rounded-full border-2"
              style={{ backgroundColor: theme.color }}
            />
            <span className="text-sm font-medium">{theme.name}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t">
        <input
          type="color"
          onChange={(e) => changeTheme(e.target.value)}
          className="w-full h-10 rounded border cursor-pointer"
          title="Pick custom color"
        />
      </div>
    </div>
  );
};

export default SimpleThemeChanger;