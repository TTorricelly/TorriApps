/**
 * Theme caching utilities with smart cache invalidation
 * Implements multi-layer caching strategy for optimal performance
 */

import { getTenantStorageKey } from '../shared/utils/tenant';

// Cache configuration
const CACHE_CONFIG = {
  THEME_TTL: 24 * 60 * 60 * 1000, // 24 hours
  CACHE_VERSION: '1.0.0',
};

/**
 * Cache structure:
 * {
 *   theme: { primary: '#ec4899', ... },
 *   timestamp: 1234567890,
 *   version: '1.0.0'
 * }
 */

/**
 * Get cached theme from localStorage
 * @returns {Object|null} Cached theme or null if expired/invalid
 */
export const getCachedTheme = () => {
  try {
    const cacheKey = getTenantStorageKey('theme_cache');
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) {
      return null;
    }

    const parsed = JSON.parse(cachedData);
    
    // Check version compatibility
    if (parsed.version !== CACHE_CONFIG.CACHE_VERSION) {
      console.log('🗑️ Theme cache version mismatch, clearing cache');
      clearThemeCache();
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    const age = now - parsed.timestamp;
    
    if (age > CACHE_CONFIG.THEME_TTL) {
      console.log('🗑️ Theme cache expired, clearing cache');
      clearThemeCache();
      return null;
    }

    console.log('✅ Using cached theme');
    return parsed.theme;
  } catch (error) {
    console.warn('Failed to read theme cache:', error);
    clearThemeCache();
    return null;
  }
};

/**
 * Cache theme to localStorage
 * @param {Object} theme - Theme configuration to cache
 */
export const setCachedTheme = (theme) => {
  try {
    const cacheKey = getTenantStorageKey('theme_cache');
    const cacheData = {
      theme,
      timestamp: Date.now(),
      version: CACHE_CONFIG.CACHE_VERSION,
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log('💾 Theme cached successfully');
  } catch (error) {
    console.warn('Failed to cache theme:', error);
  }
};

/**
 * Clear theme cache
 */
export const clearThemeCache = () => {
  try {
    const cacheKey = getTenantStorageKey('theme_cache');
    localStorage.removeItem(cacheKey);
    console.log('🗑️ Theme cache cleared');
  } catch (error) {
    console.warn('Failed to clear theme cache:', error);
  }
};

/**
 * In-memory cache for current session
 * Provides fastest access for frequent theme operations
 */
class ThemeMemoryCache {
  constructor() {
    this.cache = null;
    this.lastFetch = null;
  }

  get(maxAge = 5 * 60 * 1000) { // 5 minutes default
    if (!this.cache || !this.lastFetch) {
      return null;
    }

    const age = Date.now() - this.lastFetch;
    if (age > maxAge) {
      this.clear();
      return null;
    }

    return this.cache;
  }

  set(theme) {
    this.cache = theme;
    this.lastFetch = Date.now();
  }

  clear() {
    this.cache = null;
    this.lastFetch = null;
  }
}

export const memoryCache = new ThemeMemoryCache();

/**
 * Clear all theme caches (memory + localStorage)
 */
export const clearAllThemeCaches = () => {
  memoryCache.clear();
  clearThemeCache();
  console.log('🗑️ All theme caches cleared');
};

/**
 * Get cache statistics for debugging
 * @returns {Object} Cache statistics
 */
export const getThemeCacheStats = () => {
  const cached = getCachedTheme();
  const memory = memoryCache.get();
  
  return {
    hasLocalStorageCache: !!cached,
    hasMemoryCache: !!memory,
    cacheAge: cached ? Date.now() - JSON.parse(localStorage.getItem(getTenantStorageKey('theme_cache')))?.timestamp : null,
    memoryAge: memory ? Date.now() - memoryCache.lastFetch : null,
  };
};