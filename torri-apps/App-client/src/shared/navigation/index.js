/**
 * Centralized Navigation Configuration for App-client
 * Single source of truth for all routes in the application
 */

export const ROUTES = {
  // Auth Routes
  LOGIN: '/login',
  
  // Client Routes
  DASHBOARD: '/dashboard',
  SERVICES: '/services',
  APPOINTMENTS: '/appointments',
  PROFILE: '/profile',
  EDIT_PROFILE: '/profile/edit',
  SCHEDULING_WIZARD: '/scheduling-wizard',
  
  // Professional Routes
  PROFESSIONAL: {
    DASHBOARD: '/professional/dashboard',
    AGENDA: '/professional/agenda',
    MENU: '/professional/menu',
    CLIENTS: '/professional/clients',
    CLIENT_CREATE: '/professional/clients/create',
    CLIENT_EDIT: (id) => `/professional/clients/edit/${id}`,
    CLIENT_DETAIL: (id) => `/professional/clients/${id}`,
    KANBAN: '/professional/kanban',
  },
  
  // Coming Soon
  COMING_SOON: '/coming-soon',
};

/**
 * Bottom navigation configuration
 * Used by BottomNavigation component
 */
export const BOTTOM_NAV_CONFIG = {
  CLIENT: [
    { key: 'home', label: 'Início', route: ROUTES.DASHBOARD },
    { key: 'services', label: 'Serviços', route: ROUTES.SERVICES },
    { key: 'appointments', label: 'Agendamentos', route: ROUTES.APPOINTMENTS },
    { key: 'profile', label: 'Perfil', route: ROUTES.PROFILE },
  ],
  
  PROFESSIONAL: [
    { key: 'dashboard', label: 'Dashboard', route: ROUTES.PROFESSIONAL.DASHBOARD },
    { key: 'agenda', label: 'Agenda', route: ROUTES.PROFESSIONAL.AGENDA },
    { key: 'clients', label: 'Clientes', route: ROUTES.PROFESSIONAL.CLIENTS },
    { key: 'kanban', label: 'Kanban', route: ROUTES.PROFESSIONAL.KANBAN },
    { key: 'menu', label: 'Menu', route: ROUTES.PROFESSIONAL.MENU },
  ],
};