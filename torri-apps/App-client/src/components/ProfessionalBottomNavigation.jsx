/**
 * ProfessionalBottomNavigation Component
 * Navigation bar for salon staff with professional-focused features
 * Features: Dashboard only for initial implementation (expandable)
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Calendar,
  Users,
  TrendingUp,
  User
} from 'lucide-react';

const ProfessionalBottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items for professional interface
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/professional/dashboard',
      isActive: location.pathname === '/professional/dashboard'
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      path: '/professional/agenda',
      isActive: location.pathname === '/professional/agenda'
    },
    {
      id: 'clients',
      label: 'Clientes',
      icon: Users,
      path: '/professional/clients',
      isActive: location.pathname.startsWith('/professional/clients')
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: User,
      path: '/profile',
      isActive: location.pathname === '/profile'
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
    <div className="bg-white border-t border-gray-200 px-4 py-2 safe-area-bottom">
      <div className="flex justify-around items-center">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-smooth ${
                item.isActive
                  ? 'text-pink-600 bg-pink-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <IconComponent 
                size={24} 
                className={`mb-1 ${
                  item.isActive ? 'text-pink-600' : 'text-gray-500'
                }`}
              />
              <span 
                className={`text-xs font-medium ${
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