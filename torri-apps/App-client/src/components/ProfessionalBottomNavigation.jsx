/**
 * ProfessionalBottomNavigation Component
 * Navigation bar for salon staff with professional-focused features
 * Features: Dashboard only for initial implementation (expandable)
 */

import { 
  LayoutDashboard,
  Calendar,
  Users,
  Menu,
  Kanban
} from 'lucide-react';
import { useNavigation } from '../shared/hooks/useNavigation';
import { BOTTOM_NAV_CONFIG } from '../shared/navigation';

const ProfessionalBottomNavigation = () => {
  const { navigate, isActive } = useNavigation();

  // Icon mapping
  const iconMap = {
    'dashboard': LayoutDashboard,
    'agenda': Calendar,
    'clients': Users,
    'kanban': Kanban,
    'menu': Menu,
  };

  // Navigation items from config with icons and state
  const navigationItems = BOTTOM_NAV_CONFIG.PROFESSIONAL.map(item => ({
    ...item,
    icon: iconMap[item.key] || Menu,
    isActive: isActive(item.route),
    path: item.route
  }));

  return (
    <div className="bg-white border-t border-gray-200 px-2 py-1 safe-area-bottom">
      <div className="flex justify-around items-center">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.route)}
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