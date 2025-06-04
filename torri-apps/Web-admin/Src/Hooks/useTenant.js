// DEPRECATED: This hook is no longer needed
// 
// Tenant and user data are now available directly from:
// 1. Auth store (useAuthStore) - populated from enhanced login
// 2. JWT token payload - contains all necessary user/tenant info
//
// Components should use useAuthStore.getState().tenantData instead
// 
// This file is kept for reference but should not be imported

import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';
import { useTenantStore } from '../stores/tenant';

const fetchTenantData = async () => {
  // DEPRECATED: Use the /tenants/me endpoint to get current user's tenant
  const response = await api.get('/tenants/me');
  return response.data;
};

// DEPRECATED: Use useAuthStore.getState().tenantData instead
export const useTenant = () => {
  console.warn('DEPRECATED: useTenant hook is deprecated. Use useAuthStore.getState().tenantData instead');
  
  const { tenantId, isAuthenticated } = useAuthStore();
  const { setTenant } = useTenantStore();
  
  return useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: fetchTenantData,
    enabled: false, // Disabled - no longer needed
    staleTime: 1000 * 60 * 10, // 10 minutes
    onSuccess: (data) => {
      // Update tenant store with fetched data
      if (data && data.name) {
        setTenant(data.id, data.name);
      }
    },
    onError: (error) => {
      console.error('Failed to fetch tenant data:', error);
    }
  });
};