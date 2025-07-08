/**
 * Centralized tenant detection utility for App-client
 * Single source of truth for tenant identification logic
 */

// Import getTenantInfo from existing implementation
import { getTenantInfo } from '../../utils/apiHelpers';

// Re-export getTenantInfo
export { getTenantInfo };

/**
 * Build API base URL with tenant awareness
 * @param {string} tenantSlug - Optional tenant slug override
 * @returns {string} API base URL
 */
export const buildApiUrl = (tenantSlug = null) => {
  const tenantInfo = getTenantInfo();
  const slug = tenantSlug || tenantInfo?.slug;
  
  // For domain-based tenants, API doesn't need slug in URL
  if (tenantInfo?.method === 'domain') {
    return '/api/v1';
  }
  
  // For slug-based tenants
  if (slug) {
    return `/api/v1/${slug}`;
  }
  
  // Fallback
  return '/api/v1';
};

/**
 * Get tenant-specific storage key
 * Useful for localStorage/sessionStorage isolation
 * @param {string} key - Base storage key
 * @returns {string} Tenant-specific storage key
 */
export const getTenantStorageKey = (key) => {
  const tenantInfo = getTenantInfo();
  const identifier = tenantInfo?.domain || tenantInfo?.slug || 'default';
  return `${identifier}_${key}`;
};

/**
 * Check if current context has a valid tenant
 * @returns {boolean} True if tenant is detected
 */
export const hasTenant = () => {
  const tenantInfo = getTenantInfo();
  return tenantInfo && tenantInfo.method !== 'none';
};