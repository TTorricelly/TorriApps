import { useNavigate as useRouterNavigate, useParams, useLocation } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import { getTenantInfo } from '../../utils/apiHelpers.js';

/**
 * Enhanced navigation hook with tenant awareness and route utilities
 * Single source of navigation logic for the entire application
 * 
 * @returns {Object} Navigation utilities
 */
export const useNavigation = () => {
  const routerNavigate = useRouterNavigate();
  const location = useLocation();
  const { tenantSlug } = useParams();
  
  // Memoize tenant info to avoid recalculation, re-evaluate when location changes
  const tenantInfo = useMemo(() => getTenantInfo(), [location.pathname]);
  const useSlugInUrl = tenantInfo?.method === 'slug';
  const currentTenantSlug = tenantSlug || tenantInfo?.slug;
  
  /**
   * Build a complete route with tenant prefix if needed
   * @param {string} path - The route path
   * @returns {string} Complete route with tenant prefix
   */
  const buildRoute = useCallback((path) => {
    if (!path) return '/';
    
    // Handle dynamic routes (functions that return paths)
    const finalPath = typeof path === 'function' ? path() : path;
    
    // Ensure path starts with /
    const normalizedPath = finalPath.startsWith('/') ? finalPath : `/${finalPath}`;
    
    if (useSlugInUrl && currentTenantSlug) {
      return `/${currentTenantSlug}${normalizedPath}`;
    }
    return normalizedPath;
  }, [useSlugInUrl, currentTenantSlug]);
  
  /**
   * Navigate to a route with tenant awareness
   * @param {string|Function} path - The route path or route function
   * @param {Object} options - Navigation options
   */
  const navigate = useCallback((path, options) => {
    const route = buildRoute(path);
    routerNavigate(route, options);
  }, [buildRoute, routerNavigate]);
  
  /**
   * Navigate back with fallback
   * @param {string} fallbackPath - Path to navigate if no history
   */
  const navigateBack = useCallback((fallbackPath = '/dashboard') => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(fallbackPath);
    }
  }, [navigate]);
  
  /**
   * Replace current route
   * @param {string|Function} path - The route path or route function
   */
  const replace = useCallback((path) => {
    navigate(path, { replace: true });
  }, [navigate]);
  
  /**
   * Check if current route matches path
   * @param {string} path - Path to check
   * @returns {boolean} True if current route matches
   */
  const isActive = useCallback((path) => {
    const targetRoute = buildRoute(path);
    return location.pathname === targetRoute;
  }, [buildRoute, location.pathname]);
  
  /**
   * Check if current route starts with path
   * @param {string} path - Path to check
   * @returns {boolean} True if current route starts with path
   */
  const isActiveSection = useCallback((path) => {
    const targetRoute = buildRoute(path);
    return location.pathname.startsWith(targetRoute);
  }, [buildRoute, location.pathname]);
  
  /**
   * Get route parameters including tenant
   * @returns {Object} All route parameters
   */
  const getParams = useCallback(() => {
    return {
      tenantSlug: currentTenantSlug,
      ...location.state,
    };
  }, [currentTenantSlug, location.state]);
  
  return {
    // Core navigation
    navigate,
    navigateBack,
    replace,
    buildRoute,
    
    // Route state
    isActive,
    isActiveSection,
    currentPath: location.pathname,
    getParams,
    
    // Tenant info
    tenantSlug: currentTenantSlug,
    isDomainBased: !useSlugInUrl,
  };
};