export const API_ENDPOINTS = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  AUTH: {
    LOGIN: '/api/v1/auth/login', // Updated
    REGISTER: '/api/v1/auth/register', // Updated
    REFRESH: '/api/v1/auth/refresh' // Updated
  },
  USERS: '/api/v1/users', // Updated
  APPOINTMENTS: '/api/v1/appointments', // Updated
  SERVICES: '/api/v1/services', // Updated
  CLIENTS: '/api/v1/clients' // Updated
};

