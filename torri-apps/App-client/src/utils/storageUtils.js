/**
 * Storage utilities for web application
 * Provides consistent interface for localStorage and sessionStorage operations
 * Web-specific implementation to replace mobile AsyncStorage functionality
 */

/**
 * Storage types enum
 */
export const STORAGE_TYPES = {
  LOCAL: 'localStorage',
  SESSION: 'sessionStorage'
};

/**
 * Checks if storage is available
 * @param {string} type - Storage type ('localStorage' or 'sessionStorage')
 * @returns {boolean} - True if storage is available
 */
const isStorageAvailable = (type) => {
  try {
    const storage = window[type];
    const test = '__storage_test__';
    storage.setItem(test, test);
    storage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Gets storage instance
 * @param {string} type - Storage type
 * @returns {Storage|null} - Storage instance or null if not available
 */
const getStorage = (type = STORAGE_TYPES.LOCAL) => {
  if (!isStorageAvailable(type)) {
    console.warn(`${type} is not available`);
    return null;
  }
  return window[type];
};

/**
 * Stores a value in the specified storage
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 * @param {string} type - Storage type
 * @returns {boolean} - True if stored successfully
 */
export const setItem = (key, value, type = STORAGE_TYPES.LOCAL) => {
  try {
    const storage = getStorage(type);
    if (!storage) return false;
    
    const serializedValue = JSON.stringify(value);
    storage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error(`Error storing item with key ${key}:`, error);
    return false;
  }
};

/**
 * Retrieves a value from the specified storage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key doesn't exist
 * @param {string} type - Storage type
 * @returns {any} - Retrieved value or default value
 */
export const getItem = (key, defaultValue = null, type = STORAGE_TYPES.LOCAL) => {
  try {
    const storage = getStorage(type);
    if (!storage) return defaultValue;
    
    const serializedValue = storage.getItem(key);
    if (serializedValue === null) return defaultValue;
    
    return JSON.parse(serializedValue);
  } catch (error) {
    console.error(`Error retrieving item with key ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Removes an item from the specified storage
 * @param {string} key - Storage key
 * @param {string} type - Storage type
 * @returns {boolean} - True if removed successfully
 */
export const removeItem = (key, type = STORAGE_TYPES.LOCAL) => {
  try {
    const storage = getStorage(type);
    if (!storage) return false;
    
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item with key ${key}:`, error);
    return false;
  }
};

/**
 * Clears all items from the specified storage
 * @param {string} type - Storage type
 * @returns {boolean} - True if cleared successfully
 */
export const clear = (type = STORAGE_TYPES.LOCAL) => {
  try {
    const storage = getStorage(type);
    if (!storage) return false;
    
    storage.clear();
    return true;
  } catch (error) {
    console.error(`Error clearing ${type}:`, error);
    return false;
  }
};

/**
 * Gets all keys from the specified storage
 * @param {string} type - Storage type
 * @returns {string[]} - Array of storage keys
 */
export const getAllKeys = (type = STORAGE_TYPES.LOCAL) => {
  try {
    const storage = getStorage(type);
    if (!storage) return [];
    
    return Object.keys(storage);
  } catch (error) {
    console.error(`Error getting all keys from ${type}:`, error);
    return [];
  }
};

/**
 * Checks if a key exists in the specified storage
 * @param {string} key - Storage key
 * @param {string} type - Storage type
 * @returns {boolean} - True if key exists
 */
export const hasItem = (key, type = STORAGE_TYPES.LOCAL) => {
  try {
    const storage = getStorage(type);
    if (!storage) return false;
    
    return storage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking if key ${key} exists:`, error);
    return false;
  }
};

/**
 * Gets the size of stored data in bytes (approximate)
 * @param {string} type - Storage type
 * @returns {number} - Approximate size in bytes
 */
export const getStorageSize = (type = STORAGE_TYPES.LOCAL) => {
  try {
    const storage = getStorage(type);
    if (!storage) return 0;
    
    let totalSize = 0;
    for (const key in storage) {
      if (storage.hasOwnProperty(key)) {
        totalSize += storage[key].length + key.length;
      }
    }
    return totalSize;
  } catch (error) {
    console.error(`Error calculating ${type} size:`, error);
    return 0;
  }
};

/**
 * Migrates data from one storage type to another
 * @param {string} key - Storage key
 * @param {string} fromType - Source storage type
 * @param {string} toType - Destination storage type
 * @returns {boolean} - True if migrated successfully
 */
export const migrateItem = (key, fromType, toType) => {
  try {
    const value = getItem(key, null, fromType);
    if (value === null) return false;
    
    const stored = setItem(key, value, toType);
    if (stored) {
      removeItem(key, fromType);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error migrating item ${key} from ${fromType} to ${toType}:`, error);
    return false;
  }
};

// Convenience methods for localStorage
export const localStorage = {
  setItem: (key, value) => setItem(key, value, STORAGE_TYPES.LOCAL),
  getItem: (key, defaultValue = null) => getItem(key, defaultValue, STORAGE_TYPES.LOCAL),
  removeItem: (key) => removeItem(key, STORAGE_TYPES.LOCAL),
  clear: () => clear(STORAGE_TYPES.LOCAL),
  getAllKeys: () => getAllKeys(STORAGE_TYPES.LOCAL),
  hasItem: (key) => hasItem(key, STORAGE_TYPES.LOCAL)
};

// Convenience methods for sessionStorage
export const sessionStorage = {
  setItem: (key, value) => setItem(key, value, STORAGE_TYPES.SESSION),
  getItem: (key, defaultValue = null) => getItem(key, defaultValue, STORAGE_TYPES.SESSION),
  removeItem: (key) => removeItem(key, STORAGE_TYPES.SESSION),
  clear: () => clear(STORAGE_TYPES.SESSION),
  getAllKeys: () => getAllKeys(STORAGE_TYPES.SESSION),
  hasItem: (key) => hasItem(key, STORAGE_TYPES.SESSION)
};