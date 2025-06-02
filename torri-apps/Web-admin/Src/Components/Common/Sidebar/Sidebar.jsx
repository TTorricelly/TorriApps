import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  ChevronRightIcon
} from '@heroicons/react/24/outline';

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
      { title: 'Histórico', path: '/appointments/history' }
    ]
  },
  {
    id: 'services',
    title: 'Serviços',
    icon: WrenchScrewdriverIcon,
    items: [
      { title: 'Catálogo', path: '/services/catalog' }
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
    id: 'clients',
    title: 'Clientes',
    icon: UsersIcon,
    items: [
      { title: 'Lista', path: '/clients/list' }
    ]
  },
  {
    id: 'settings',
    title: 'Configurações',
    icon: Cog6ToothIcon,
    items: [
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

  return (
    <div className="bg-bg-secondary w-64 h-screen shadow-card border-r border-bg-tertiary flex flex-col">
      {/* Sidebar Header */}
      <div className="p-l border-b border-bg-tertiary flex justify-center flex-shrink-0">
        <img 
          src="/src/assets/logo-torriapps.png" 
          alt="TorriApps" 
          className="h-25 w-auto"
        />
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
    </div>
  );
}