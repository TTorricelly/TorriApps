import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
  BuildingStorefrontIcon,
  BanknotesIcon,
  Bars3Icon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../../stores/auth';
import { useTenantStore } from '../../../stores/tenant';

const menuItems = [
  {
    id: 'appointments',
    title: 'Agendamentos',
    icon: CalendarDaysIcon,
    items: [
      { title: 'Agenda Diária', path: '/appointments/daily-schedule' },
      { title: 'Kanban Board', path: '/appointments/kanban' }
    ]
  },
  {
    id: 'services',
    title: 'Serviços',
    icon: WrenchScrewdriverIcon,
    items: [
      { title: 'Categorias', path: '/services/catalog' },
      { title: 'Catálogo de Serviços', path: '/services/list' },
      { title: 'Rótulos', path: '/labels' }
    ]
  },
  {
    id: 'professionals',
    title: 'Profissionais',
    icon: UserGroupIcon,
    items: [
      { title: 'Equipe', path: '/professionals/team' }
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
      { title: 'Cadastros', path: '/clients' } // Changed path here
    ]
  },
  {
    id: 'financial',
    title: 'Financeiro',
    icon: BanknotesIcon,
    items: [
      { title: 'Comissões', path: '/commissions' }
    ]
  },
  {
    id: 'settings',
    title: 'Configurações',
    icon: Cog6ToothIcon,
    items: [
      { title: 'Configurações do App', path: '/settings' },
      { title: 'Perfil do Salão', path: '/settings/salon-profile' },
      { title: 'Usuários', path: '/settings/users' }
    ]
  }
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [expandedGroups, setExpandedGroups] = useState(['dashboard']); // Dashboard expanded by default
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [buttonBounds, setButtonBounds] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const tooltipRef = useRef(null);
  const { userEmail, clearAuth, tenantData, userData } = useAuthStore();

  // Update tooltip dimensions when it mounts
  const updateTooltipBounds = useCallback(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipPosition(prev => ({
        ...prev,
        width: rect.width,
        height: rect.height
      }));
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) { // lg breakpoint
        setIsCollapsed(true);
      }
    };
    
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update tooltip bounds when it appears
  useEffect(() => {
    if (hoveredGroup && tooltipRef.current) {
      // Small delay to ensure tooltip is rendered
      setTimeout(updateTooltipBounds, 0);
    }
  }, [hoveredGroup, updateTooltipBounds]);

  // Mouse tracking for tooltip stability
  useEffect(() => {
    if (!isCollapsed || !hoveredGroup) return;

    const handleMouseMove = (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Check if mouse is over button (with padding for better UX)
      const isOverButton = mouseX >= buttonBounds.left && 
                          mouseX <= buttonBounds.left + buttonBounds.width &&
                          mouseY >= buttonBounds.top && 
                          mouseY <= buttonBounds.top + buttonBounds.height;

      // Check if mouse is over tooltip (with some tolerance)
      const isOverTooltip = tooltipPosition.width > 0 && tooltipPosition.height > 0 &&
                           mouseX >= tooltipPosition.left - 4 && 
                           mouseX <= tooltipPosition.left + tooltipPosition.width + 4 &&
                           mouseY >= tooltipPosition.top - 4 && 
                           mouseY <= tooltipPosition.top + tooltipPosition.height + 4;

      // Check if mouse is in the bridge area between button and tooltip
      const isInBridge = mouseX >= Math.min(buttonBounds.left + buttonBounds.width, tooltipPosition.left) &&
                        mouseX <= Math.max(buttonBounds.left + buttonBounds.width, tooltipPosition.left) &&
                        mouseY >= Math.min(buttonBounds.top, tooltipPosition.top) &&
                        mouseY <= Math.max(buttonBounds.top + buttonBounds.height, tooltipPosition.top + tooltipPosition.height);

      // Hide tooltip if mouse is not over any of these areas
      if (!isOverButton && !isOverTooltip && !isInBridge) {
        setHoveredGroup(null);
      }
    };

    // Add small delay before starting to track mouse movements
    const timeout = setTimeout(() => {
      document.addEventListener('mousemove', handleMouseMove);
    }, 50);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isCollapsed, hoveredGroup, buttonBounds, tooltipPosition]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    // Collapse all groups when sidebar is collapsed
    if (!isCollapsed) {
      setExpandedGroups([]);
    }
  };

  const toggleGroup = (groupId) => {
    // When collapsed, navigate to first item in group
    if (isCollapsed) {
      const group = menuItems.find(item => item.id === groupId);
      if (group?.items?.length > 0) {
        handleItemClick(group.items[0].path);
      }
      return;
    }
    
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const isItemActive = (path) => {
    const fullPath = `/${tenantSlug}${path}`;
    return location.pathname === fullPath;
  };

  const isGroupActive = (items) => {
    return items.some(item => {
      const fullPath = `/${tenantSlug}${item.path}`;
      return location.pathname === fullPath;
    });
  };

  const handleItemClick = (path) => {
    const fullPath = `/${tenantSlug}${path}`;
    navigate(fullPath);
  };

  const handleLogout = () => {
    clearAuth();
    // Clear tenant data on logout
    const { clearTenant } = useTenantStore.getState();
    clearTenant();
    navigate(`/${tenantSlug}/login`);
  };

  const handleProfile = () => {
    // Navigate to profile page when implemented
    console.log('Navigate to profile');
  };

  const handleMouseEnter = (groupId, event) => {
    if (!isCollapsed) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    
    // Store button bounds for mouse tracking with some padding for better UX
    setButtonBounds({
      top: rect.top - 2,
      left: rect.left - 2,
      width: rect.width + 4,
      height: rect.height + 4
    });
    
    // Set initial tooltip position (will be updated when tooltip mounts)
    setTooltipPosition({
      top: rect.top,
      left: rect.right + 8, // Add some spacing from sidebar
      width: 192, // min-w-48 = 192px
      height: 120 // Estimated height
    });
    
    setHoveredGroup(groupId);
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
    <div className={`bg-bg-secondary h-screen shadow-card border-r border-bg-tertiary flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16 overflow-visible' : 'w-64'
    }`}>
      {/* Sidebar Header */}
      <div className={`border-b border-bg-tertiary flex-shrink-0 ${isCollapsed ? 'p-s' : 'p-l'}`}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex justify-center flex-1 mb-s">
              <img 
                src="/Reilo1.png" 
                alt="Reilo" 
                className="h-28 w-auto"
              />
            </div>
          )}
          
          {/* Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-button hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
          >
            {isCollapsed ? (
              <Bars3Icon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>
       
      </div>

      {/* Navigation Menu */}
      <nav className={`mt-l flex-1 overflow-y-auto pb-l ${isCollapsed ? 'px-s overflow-x-visible' : 'overflow-x-hidden'}`}>
        {menuItems.map((group) => {
          const isExpanded = expandedGroups.includes(group.id) && !isCollapsed;
          const isActive = isGroupActive(group.items);
          
          return (
            <div key={group.id} className="mb-xs">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                onMouseEnter={(e) => handleMouseEnter(group.id, e)}
                className={`w-full flex items-center hover:bg-bg-tertiary transition-colors duration-fast relative ${
                  isCollapsed ? 'justify-center px-s py-s' : 'justify-between px-l py-s'
                } ${isActive ? 'bg-bg-tertiary border-r-2 border-accent-primary' : ''}`}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'text-left'}`}>
                  <group.icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-s'} ${isActive ? 'text-accent-primary' : 'text-text-secondary'}`} />
                  {!isCollapsed && (
                    <span className={`font-medium text-small ${isActive ? 'text-accent-primary' : 'text-text-primary'}`}>
                      {group.title}
                    </span>
                  )}
                </div>
                
                {!isCollapsed && (
                  <>
                    {isExpanded ? (
                      <ChevronDownIcon className="h-4 w-4 text-text-secondary" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-text-secondary" />
                    )}
                  </>
                )}

              </button>

              {/* Group Items */}
              {isExpanded && !isCollapsed && (
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
      <div className={`border-t border-bg-tertiary flex-shrink-0 ${isCollapsed ? 'p-s' : 'p-m'}`}>
        <Menu as="div" className="relative">
          <Menu.Button className={`w-full flex items-center text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-secondary rounded-button p-s transition-colors duration-fast group ${
            isCollapsed ? 'justify-center' : 'space-x-s'
          }`}
          title={isCollapsed ? displayUserName() : ''}
          >
            <UserCircleIcon className="h-8 w-8" />
            {!isCollapsed && (
              <>
                <div className="flex-1 text-left">
                  <div className="text-small font-medium text-text-primary truncate">
                    {displayUserName()}
                  </div>
                  <div className="text-xs text-text-secondary truncate">
                    {userData?.role || 'GESTOR'}
                  </div>
                </div>
                <ChevronDownIcon className="h-4 w-4" />
              </>
            )}
            
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999]">
                {displayUserName()}
              </div>
            )}
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
      
      {/* Fixed position tooltip for collapsed sidebar */}
      {isCollapsed && hoveredGroup && (
        <div 
          ref={tooltipRef}
          className="fixed bg-bg-secondary border border-bg-tertiary rounded-card shadow-card-hover min-w-48 z-[9999]"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {(() => {
            const group = menuItems.find(item => item.id === hoveredGroup);
            if (!group) return null;
            
            return (
              <>
                {/* Header */}
                <div className="px-3 py-2 border-b border-bg-tertiary">
                  <div className="flex items-center gap-2">
                    <group.icon className="h-4 w-4 text-accent-primary" />
                    <span className="font-medium text-small text-text-primary">{group.title}</span>
                  </div>
                </div>
                
                {/* Sub-menu items */}
                <div className="py-1">
                  {group.items.map((item) => {
                    const itemActive = isItemActive(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          handleItemClick(item.path);
                          setHoveredGroup(null);
                        }}
                        className={`w-full text-left px-3 py-2 text-small hover:bg-bg-tertiary transition-colors duration-fast ${
                          itemActive ? 'text-accent-primary bg-bg-tertiary font-medium' : 'text-text-secondary'
                        }`}
                      >
                        {item.title}
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}