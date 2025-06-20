import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { 
  HomeIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  UsersIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../../stores/auth';
import { useTenantStore } from '../../../stores/tenant';

const menuItems = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: HomeIcon,
    items: [
      { title: 'Visão Geral', path: '/dashboard' }
    ]
  },
  {
    id: 'appointments',
    title: 'Agendamentos',
    icon: CalendarDaysIcon,
    items: [
      { title: 'Agenda', path: '/appointments/calendar' },
      { title: 'Agenda Diária', path: '/appointments/daily-schedule' },
      { title: 'Histórico', path: '/appointments/history' }
    ]
  },
  {
    id: 'services',
    title: 'Serviços',
    icon: WrenchScrewdriverIcon,
    items: [
      { title: 'Categorias', path: '/services/catalog' },
      { title: 'Catálogo de Serviços', path: '/services/list' }
    ]
  },
  {
    id: 'professionals',
    title: 'Profissionais',
    icon: UserGroupIcon,
    items: [
      { title: 'Equipe', path: '/professionals/team' },
      { title: 'Disponibilidades', path: '/professionals/availability' }
    ]
  },
  {
    id: 'stations',
    title: 'Estações',
    icon: BuildingStorefrontIcon,
    items: [
      { title: 'Tipos de Estação', path: '/stations/types' },
      { title: 'Estações', path: '/stations' }
    ]
  },
  {
    id: 'clients',
    title: 'Clientes',
    icon: UsersIcon,
    items: [
      { title: 'Lista', path: '/clients' } // Changed path here
    ]
  },
  {
    id: 'settings',
    title: 'Configurações',
    icon: Cog6ToothIcon,
    items: [
      { title: 'Configurações do App', path: '/settings' },
      { title: 'Perfil do Salão', path: '/settings/salon-profile' },
      { title: 'Usuários', path: '/settings/users' },
      { title: 'Plano & Pagamento', path: '/settings/billing' }
    ]
  }
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState(['dashboard']); // Dashboard expanded by default
  const { userEmail, clearAuth, tenantData, userData } = useAuthStore();

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isItemActive = (path) => {
    return location.pathname === path;
  };

  const isGroupActive = (items) => {
    return items.some(item => location.pathname === item.path);
  };

  const handleItemClick = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    clearAuth();
    // Clear tenant data on logout
    const { clearTenant } = useTenantStore.getState();
    clearTenant();
    navigate('/login');
  };

  const handleProfile = () => {
    // Navigate to profile page when implemented
    console.log('Navigate to profile');
  };

  const displayTenantName = () => {
    if (tenantData?.name) return tenantData.name;
    return "Demo Salon"; // Fallback
  };
  
  const displayUserName = () => {
    if (userData?.full_name) return userData.full_name;
    return userEmail; // Fallback to email
  };

  return (
    <div className="bg-bg-secondary w-64 h-screen shadow-card border-r border-bg-tertiary flex flex-col">
      {/* Sidebar Header */}
      <div className="p-l border-b border-bg-tertiary flex-shrink-0">
        <div className="flex justify-center mb-s">
          <img 
            src="/logo-torriapps.png" 
            alt="Reilo" 
            className="h-28 w-auto"
          />
        </div>
       
      </div>

      {/* Navigation Menu */}
      <nav className="mt-l flex-1 overflow-y-auto overflow-x-hidden pb-l">
        {menuItems.map((group) => {
          const isExpanded = expandedGroups.includes(group.id);
          const isActive = isGroupActive(group.items);
          
          return (
            <div key={group.id} className="mb-xs">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-l py-s text-left hover:bg-bg-tertiary transition-colors duration-fast ${
                  isActive ? 'bg-bg-tertiary border-r-2 border-accent-primary' : ''
                }`}
              >
                <div className="flex items-center">
                  <group.icon className={`h-5 w-5 mr-s ${isActive ? 'text-accent-primary' : 'text-text-secondary'}`} />
                  <span className={`font-medium text-small ${isActive ? 'text-accent-primary' : 'text-text-primary'}`}>
                    {group.title}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-text-secondary" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-text-secondary" />
                )}
              </button>

              {/* Group Items */}
              {isExpanded && (
                <div className="ml-s border-l border-bg-tertiary pl-m">
                  {group.items.map((item) => {
                    const itemActive = isItemActive(item.path);
                    
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleItemClick(item.path)}
                        className={`w-full text-left px-s py-xs relative hover:bg-bg-tertiary transition-colors duration-fast ${
                          itemActive ? 'text-accent-primary font-medium bg-bg-tertiary' : 'text-text-secondary'
                        }`}
                      >
                        {itemActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent-primary"></div>
                        )}
                        <span className="text-small">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-bg-tertiary p-m flex-shrink-0">
        <Menu as="div" className="relative">
          <Menu.Button className="w-full flex items-center space-x-s text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-secondary rounded-button p-s transition-colors duration-fast">
            <UserCircleIcon className="h-8 w-8" />
            <div className="flex-1 text-left">
              <div className="text-small font-medium text-text-primary truncate">
                {displayUserName()}
              </div>
              <div className="text-xs text-text-secondary truncate">
                {userData?.role || 'GESTOR'}
              </div>
            </div>
            <ChevronDownIcon className="h-4 w-4" />
          </Menu.Button>

          <Transition
            enter="transition ease-out duration-fast"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute bottom-full left-0 right-0 mb-2 origin-bottom bg-bg-secondary rounded-card shadow-card-hover ring-1 ring-bg-tertiary focus:outline-none z-50">
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleProfile}
                      className={`${
                        active ? 'bg-bg-tertiary' : ''
                      } flex items-center w-full px-m py-xs text-small text-text-primary hover:bg-bg-tertiary transition-colors duration-fast`}
                    >
                      <UserCircleIcon className="h-4 w-4 mr-s text-accent-primary" />
                      Ver Perfil
                    </button>
                  )}
                </Menu.Item>
                
                <div className="border-t border-bg-tertiary"></div>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={`${
                        active ? 'bg-bg-tertiary' : ''
                      } flex items-center w-full px-m py-xs text-small text-text-primary hover:bg-bg-tertiary transition-colors duration-fast`}
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4 mr-s text-status-error" />
                      Sair
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
    </div>
  );
}