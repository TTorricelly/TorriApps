/**
 * ProfessionalBottomNavigation Component
 * Navigation bar for salon staff with professional-focused features
 * Features: Dashboard only for initial implementation (expandable)
 */

import React from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  LayoutDashboard,
  Calendar,
  Users,
  TrendingUp,
  Menu,
  Kanban
} from 'lucide-react';
import { getTenantInfo } from '../utils/apiHelpers';

const ProfessionalBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Helper function to check if route is active
  const isRouteActive = (path) => {
    const targetRoute = buildRoute(path);
    return location.pathname === targetRoute;
  };

  // Helper function to check if route starts with path
  const isRouteStartsWith = (path) => {
    const targetRoute = buildRoute(path);
    return location.pathname.startsWith(targetRoute);
  };

  // Navigation items for professional interface
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: buildRoute('/professional/dashboard'),
      isActive: isRouteActive('/professional/dashboard')
    },
    {
      id: 'kanban',
      label: 'Atendimentos',
      icon: Kanban,
      path: buildRoute('/kanban'),
      isActive: isRouteActive('/kanban') || isRouteActive('/professional/kanban')
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      path: buildRoute('/professional/agenda'),
      isActive: isRouteActive('/professional/agenda')
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      path: buildRoute('/professional/clients'),
      isActive: isRouteStartsWith('/professional/clients')
    },
    {
      id: 'menu',
      label: 'Menu',
      icon: Menu,
      path: buildRoute('/professional/menu'),
      isActive: isRouteActive('/professional/menu')
    }
    // Future expansion items (commented for now):
    // {
    //   id: 'appointments',
    //   label: 'Agenda',
    //   icon: Calendar,
    //   path: '/professional/appointments',
    //   isActive: location.pathname === '/professional/appointments'
    // },
    // {
    //   id: 'clients',
    //   label: 'Clientes',
    //   icon: Users,
    //   path: '/professional/clients',
    //   isActive: location.pathname === '/professional/clients'
    // },
    // {
    //   id: 'reports',
    //   label: 'Relatórios',
    //   icon: TrendingUp,
    //   path: '/professional/reports',
    //   isActive: location.pathname === '/professional/reports'
    // },
    // {
    //   id: 'profile',
    //   label: 'Perfil',
    //   icon: User,
    //   path: '/professional/profile',
    //   isActive: location.pathname === '/professional/profile'
    // }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <div className="bg-white border-t border-gray-200 px-2 py-1 safe-area-bottom">
      <div className="flex justify-around items-center">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center py-1 px-1 rounded-lg transition-smooth min-w-0 ${
                item.isActive
                  ? 'text-pink-600 bg-pink-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <IconComponent 
                size={20} 
                className={`mb-0.5 ${
                  item.isActive ? 'text-pink-600' : 'text-gray-500'
                }`}
              />
              <span 
                className={`text-[10px] font-medium leading-tight truncate max-w-[60px] ${
                  item.isActive ? 'text-pink-600' : 'text-gray-500'
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

export default ProfessionalBottomNavigation;