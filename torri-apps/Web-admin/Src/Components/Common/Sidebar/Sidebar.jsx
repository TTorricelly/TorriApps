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
    <div className="bg-white w-64 min-h-screen shadow-lg border-r border-gray-200">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Menu Principal</h2>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-6">
        {menuItems.map((group) => {
          const isExpanded = expandedGroups.includes(group.id);
          const isActive = isGroupActive(group.items);
          
          return (
            <div key={group.id} className="mb-2">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 transition-colors duration-200 ${
                  isActive ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center">
                  <group.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-700'}`}>
                    {group.title}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {/* Group Items */}
              {isExpanded && (
                <div className="ml-6 border-l border-gray-200">
                  {group.items.map((item) => {
                    const itemActive = isItemActive(item.path);
                    
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleItemClick(item.path)}
                        className={`w-full text-left px-6 py-2 ml-4 relative hover:bg-gray-50 transition-colors duration-200 ${
                          itemActive ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-600'
                        }`}
                      >
                        {itemActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500"></div>
                        )}
                        <span className="ml-2">{item.title}</span>
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