/**
 * Simplified theme system - guaranteed to work
 * This bypasses complex logic and directly applies CSS
 */

/**
 * Apply theme with simple, direct CSS injection
 * @param {string} primaryColor - Hex color code
 */
export const applySimpleTheme = (primaryColor) => {
  console.log('🎨 Applying simple theme:', primaryColor);
  
  // Remove existing theme styles
  const existingStyle = document.getElementById('simple-theme-override');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Create new style element
  const style = document.createElement('style');
  style.id = 'simple-theme-override';
  
  // Simple CSS that overrides everything
  style.textContent = `
    /* Override all primary colors directly */
    .bg-primary-50 { background-color: ${lighten(primaryColor, 0.9)} !important; }
    .bg-primary-100 { background-color: ${lighten(primaryColor, 0.8)} !important; }
    .bg-primary-200 { background-color: ${lighten(primaryColor, 0.6)} !important; }
    .bg-primary-300 { background-color: ${lighten(primaryColor, 0.4)} !important; }
    .bg-primary-400 { background-color: ${lighten(primaryColor, 0.2)} !important; }
    .bg-primary-500 { background-color: ${primaryColor} !important; }
    .bg-primary-600 { background-color: ${darken(primaryColor, 0.1)} !important; }
    .bg-primary-700 { background-color: ${darken(primaryColor, 0.2)} !important; }
    .bg-primary-800 { background-color: ${darken(primaryColor, 0.3)} !important; }
    .bg-primary-900 { background-color: ${darken(primaryColor, 0.4)} !important; }
    
    .text-primary-50 { color: ${lighten(primaryColor, 0.9)} !important; }
    .text-primary-100 { color: ${lighten(primaryColor, 0.8)} !important; }
    .text-primary-200 { color: ${lighten(primaryColor, 0.6)} !important; }
    .text-primary-300 { color: ${lighten(primaryColor, 0.4)} !important; }
    .text-primary-400 { color: ${lighten(primaryColor, 0.2)} !important; }
    .text-primary-500 { color: ${primaryColor} !important; }
    .text-primary-600 { color: ${darken(primaryColor, 0.1)} !important; }
    .text-primary-700 { color: ${darken(primaryColor, 0.2)} !important; }
    .text-primary-800 { color: ${darken(primaryColor, 0.3)} !important; }
    .text-primary-900 { color: ${darken(primaryColor, 0.4)} !important; }
    
    .border-primary-50 { border-color: ${lighten(primaryColor, 0.9)} !important; }
    .border-primary-100 { border-color: ${lighten(primaryColor, 0.8)} !important; }
    .border-primary-200 { border-color: ${lighten(primaryColor, 0.6)} !important; }
    .border-primary-300 { border-color: ${lighten(primaryColor, 0.4)} !important; }
    .border-primary-400 { border-color: ${lighten(primaryColor, 0.2)} !important; }
    .border-primary-500 { border-color: ${primaryColor} !important; }
    .border-primary-600 { border-color: ${darken(primaryColor, 0.1)} !important; }
    .border-primary-700 { border-color: ${darken(primaryColor, 0.2)} !important; }
    .border-primary-800 { border-color: ${darken(primaryColor, 0.3)} !important; }
    .border-primary-900 { border-color: ${darken(primaryColor, 0.4)} !important; }
    
    /* Hover states */
    .hover\\:bg-primary-500:hover { background-color: ${primaryColor} !important; }
    .hover\\:bg-primary-600:hover { background-color: ${darken(primaryColor, 0.1)} !important; }
    .hover\\:bg-primary-700:hover { background-color: ${darken(primaryColor, 0.2)} !important; }
    
    /* Meta theme color for PWA */
    meta[name="theme-color"] { content: ${primaryColor} !important; }
  `;
  
  // Add to head
  document.head.appendChild(style);
  
  // Update meta theme color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', primaryColor);
  }
  
  // Update body background for status bar
  document.body.style.backgroundColor = primaryColor;
  
  console.log('✅ Simple theme applied successfully');
};

/**
 * Lighten a hex color
 * @param {string} color - Hex color
 * @param {number} factor - 0-1
 */
const lighten = (color, factor) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const newR = Math.min(255, Math.round(r + (255 - r) * factor));
  const newG = Math.min(255, Math.round(g + (255 - g) * factor));
  const newB = Math.min(255, Math.round(b + (255 - b) * factor));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

/**
 * Darken a hex color
 * @param {string} color - Hex color
 * @param {number} factor - 0-1
 */
const darken = (color, factor) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const newR = Math.max(0, Math.round(r * (1 - factor)));
  const newG = Math.max(0, Math.round(g * (1 - factor)));
  const newB = Math.max(0, Math.round(b * (1 - factor)));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};