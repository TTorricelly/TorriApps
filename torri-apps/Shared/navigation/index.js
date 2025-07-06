/**
 * Centralized Navigation Configuration
 * Single source of truth for all routes in the application
 * Changes here automatically propagate to all navigation components
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
    CLIENT_FORM: '/professional/clients/create',
    CLIENT_EDIT: (id) => `/professional/clients/edit/${id}`,
    CLIENT_DETAIL: (id) => `/professional/clients/${id}`,
    KANBAN: '/professional/kanban',
  },
  
  // Admin Routes (Web-admin specific)
  ADMIN: {
    SERVICES: {
      LIST: '/services/list',
      CATALOG: '/services/catalog',
      CREATE: '/services/create',
      EDIT: (id) => `/services/edit/${id}`,
    },
    PROFESSIONALS: {
      LIST: '/professionals/team',
      CREATE: '/professionals/create',
      EDIT: (id) => `/professionals/edit/${id}`,
    },
    USERS: {
      LIST: '/settings/users',
      CREATE: '/settings/users/create',
      EDIT: (id) => `/settings/users/edit/${id}`,
    },
    CLIENTS: {
      LIST: '/clients',
      CREATE: '/clients/create',
      EDIT: (id) => `/clients/edit/${id}`,
    },
    APPOINTMENTS: {
      DAILY_SCHEDULE: '/appointments/daily-schedule',
      KANBAN: '/appointments/kanban',
      CALENDAR: '/appointments/calendar',
      HISTORY: '/appointments/history',
    },
    LABELS: '/labels',
    STATIONS: {
      TYPES: '/stations/types',
      LIST: '/stations',
    },
    SETTINGS: {
      ROOT: '/settings',
      SALON_PROFILE: '/settings/salon-profile',
      BILLING: '/settings/billing',
    },
    COMMISSIONS: '/commissions',
  }
};

/**
 * Route configuration for navigation items
 * Used by navigation components to build menus
 */
export const NAVIGATION_CONFIG = {
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
  
  ADMIN_SIDEBAR: {
    appointments: {
      title: 'Agendamentos',
      items: [
        { title: 'Agenda Diária', path: ROUTES.ADMIN.APPOINTMENTS.DAILY_SCHEDULE },
        { title: 'Kanban Board', path: ROUTES.ADMIN.APPOINTMENTS.KANBAN }
      ]
    },
    services: {
      title: 'Serviços',
      items: [
        { title: 'Categorias', path: ROUTES.ADMIN.SERVICES.CATALOG },
        { title: 'Catálogo de Serviços', path: ROUTES.ADMIN.SERVICES.LIST },
        { title: 'Rótulos', path: ROUTES.ADMIN.LABELS }
      ]
    },
    professionals: {
      title: 'Profissionais',
      items: [
        { title: 'Equipe', path: ROUTES.ADMIN.PROFESSIONALS.LIST }
      ]
    },
    stations: {
      title: 'Estações',
      items: [
        { title: 'Tipos de Estação', path: ROUTES.ADMIN.STATIONS.TYPES },
        { title: 'Estações', path: ROUTES.ADMIN.STATIONS.LIST }
      ]
    },
    clients: {
      title: 'Clientes',
      items: [
        { title: 'Cadastros', path: ROUTES.ADMIN.CLIENTS.LIST }
      ]
    },
    financial: {
      title: 'Financeiro',
      items: [
        { title: 'Comissões', path: ROUTES.ADMIN.COMMISSIONS }
      ]
    },
    settings: {
      title: 'Configurações',
      items: [
        { title: 'Configurações do App', path: ROUTES.ADMIN.SETTINGS.ROOT },
        { title: 'Perfil do Salão', path: ROUTES.ADMIN.SETTINGS.SALON_PROFILE },
        { title: 'Usuários', path: ROUTES.ADMIN.USERS.LIST }
      ]
    }
  }
};