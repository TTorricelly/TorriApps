/**
 * Centralized Navigation Configuration for Web-admin
 * Single source of truth for all routes in the application
 */

export const ROUTES = {
  // Auth Routes
  LOGIN: '/login',
  
  // Main Dashboard
  DASHBOARD: '/dashboard',
  
  // Services Routes
  SERVICES: {
    LIST: '/services/list',
    CATALOG: '/services/catalog',
    CREATE: '/services/create',
    EDIT: (id) => `/services/edit/${id}`,
    APPOINTMENT_CONFIG: '/services/appointment-config',
  },
  
  // Professionals Routes
  PROFESSIONALS: {
    LIST: '/professionals/team',
    CREATE: '/professionals/create',
    EDIT: (id) => `/professionals/edit/${id}`,
  },
  
  // Users Routes
  USERS: {
    LIST: '/settings/users',
    CREATE: '/settings/users/create',
    EDIT: (id) => `/settings/users/edit/${id}`,
  },
  
  // Clients Routes
  CLIENTS: {
    LIST: '/clients',
    CREATE: '/clients/create',
    EDIT: (id) => `/clients/edit/${id}`,
  },
  
  // Appointments Routes
  APPOINTMENTS: {
    DAILY_SCHEDULE: '/appointments/daily-schedule',
    KANBAN: '/appointments/kanban',
    CALENDAR: '/appointments/calendar',
    HISTORY: '/appointments/history',
  },
  
  // Other Routes
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
};

/**
 * Sidebar navigation configuration
 * Used by Sidebar component
 */
export const SIDEBAR_CONFIG = [
  {
    id: 'appointments',
    title: 'Agendamentos',
    items: [
      { title: 'Agenda Diária', path: ROUTES.APPOINTMENTS.DAILY_SCHEDULE },
      { title: 'Kanban Board', path: ROUTES.APPOINTMENTS.KANBAN }
    ]
  },
  {
    id: 'services',
    title: 'Serviços',
    items: [
      { title: 'Categorias', path: ROUTES.SERVICES.CATALOG },
      { title: 'Catálogo de Serviços', path: ROUTES.SERVICES.LIST },
      { title: 'Configuração de Agendamentos', path: ROUTES.SERVICES.APPOINTMENT_CONFIG },
      { title: 'Rótulos', path: ROUTES.LABELS }
    ]
  },
  {
    id: 'professionals',
    title: 'Profissionais',
    items: [
      { title: 'Equipe', path: ROUTES.PROFESSIONALS.LIST }
    ]
  },
  {
    id: 'stations',
    title: 'Estações',
    items: [
      { title: 'Tipos de Estação', path: ROUTES.STATIONS.TYPES },
      { title: 'Estações', path: ROUTES.STATIONS.LIST }
    ]
  },
  {
    id: 'clients',
    title: 'Clientes',
    items: [
      { title: 'Cadastros', path: ROUTES.CLIENTS.LIST }
    ]
  },
  {
    id: 'financial',
    title: 'Financeiro',
    items: [
      { title: 'Comissões', path: ROUTES.COMMISSIONS }
    ]
  },
  {
    id: 'settings',
    title: 'Configurações',
    items: [
      { title: 'Configurações do App', path: ROUTES.SETTINGS.ROOT },
      { title: 'Perfil do Salão', path: ROUTES.SETTINGS.SALON_PROFILE },
      { title: 'Usuários', path: ROUTES.USERS.LIST }
    ]
  }
];