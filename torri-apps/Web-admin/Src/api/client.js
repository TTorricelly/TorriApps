import axios from 'axios';

// Placeholder for tenant ID - will be fetched from Zustand store
const getTenantId = () => {
  // Replace with actual logic to get tenantId from Zustand store
  // For example: const tenantId = useTenantStore.getState().tenantId;
  // return tenantId || 'default-tenant'; // Fallback or error if not found
  console.warn('Tenant ID is not yet implemented in api/client.js');
  return 'public'; // Default or placeholder
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // send cookies
});

// Interceptor to add X-Tenant-ID header
api.interceptors.request.use(
  config => {
    const tenantId = getTenantId();
    if (tenantId && !config.url.includes('/auth/')) { // Example: don't add for auth routes
      config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      // Optional: redirect to login or use auth store to update state
      console.error('Unauthorized access - 401. TODO: Redirect to login.');
      // window.location.href = '/login'; // Example, better to use React Router navigation
    }
    return Promise.reject(err);
  }
);
