/**
 * Bottom Navigation Component (Web Version)
 * Maintains identical navigation structure from Mobile-client-core
 * Only UI components are adapted for web - all logic preserved
 */

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Home, ShoppingCart, Calendar, User } from 'lucide-react';
import useServicesStore from '../stores/servicesStore';
import { getTenantInfo } from '../utils/apiHelpers';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const { selectedServices } = useServicesStore();

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

  // Helper function to check if route is active
  const isRouteActive = (path) => {
    const targetRoute = buildRoute(path);
    return location.pathname === targetRoute;
  };

  // Icon mapping
  const iconMap = {
    'home': Home,
    'services': ShoppingCart,
    'appointments': Calendar,
    'profile': User,
  };

  // Navigation items from config with icons and state
  const navItems = BOTTOM_NAV_CONFIG.CLIENT.map(item => ({
    ...item,
    icon: iconMap[item.key] || User,
    isActive: isActive(item.route),
    badge: item.key === 'services' && selectedServices.length > 0 ? selectedServices.length : null
  }));

  const handleNavigation = (route) => {
    navigate(route);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-4">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = item.isActive;
          
          return (
            <button
              key={item.key}
              onClick={() => handleNavigation(item.route)}
              className="flex flex-col items-center justify-center flex-1 py-2 relative"
            >
              <div className="relative">
                <IconComponent 
                  size={24}
                  color={isActive ? '#ec4899' : '#9ca3af'}
                  className="transition-colors duration-200"
                />
                {item.badge && (
                  <div className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {item.badge}
                  </div>
                )}
              </div>
              <span 
                className={`text-xs mt-1 transition-colors duration-200 ${
                  isActive ? 'text-pink-500 font-medium' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;