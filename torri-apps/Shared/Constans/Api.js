export const API_ENDPOINTS = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh'
  },
  USERS: '/users',
  APPOINTMENTS: '/appointments',
  SERVICES: '/services',
  CLIENTS: '/clients'
};

