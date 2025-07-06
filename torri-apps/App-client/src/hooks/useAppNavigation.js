import { useNavigate, useParams } from 'react-router-dom';
import { getTenantInfo } from '../utils/apiHelpers';

/**
 * Custom hook for tenant-aware navigation
 * Handles both domain-based and slug-based tenant routing
 * 
 * @returns {Object} - { navigate: Function, buildRoute: Function }
 * 
 * @example
 * const { navigate, buildRoute } = useAppNavigation();
 * 
 * // Navigate to a route
 * navigate('/dashboard');
 * 
 * // Build a route URL for links
 * <Link to={buildRoute('/services')}>Services</Link>
 */
export const useAppNavigation = () => {
  const reactNavigate = useNavigate();
  const { tenantSlug } = useParams();
  
  // Get tenant info to determine URL structure
  const tenantInfo = getTenantInfo();
  const useSlugInUrl = tenantInfo?.method === 'slug';
  const currentTenantSlug = tenantSlug || tenantInfo?.slug;
  
  // Helper function to build routes based on tenant type
  const buildRoute = (path) => {
    if (useSlugInUrl && currentTenantSlug) {
      return `/${currentTenantSlug}${path}`;
    }
    return path;
  };
  
  // Wrapper for navigate that automatically builds the route
  const navigate = (path, options) => {
    reactNavigate(buildRoute(path), options);
  };
  
  return { navigate, buildRoute };
};