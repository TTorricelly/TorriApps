import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';
import { useTenantStore } from '../stores/tenant';

const fetchTenantData = async () => {
  // Use the /tenants/me endpoint to get current user's tenant
  const response = await api.get('/tenants/me');
  return response.data;
};

export const useTenant = () => {
  const { tenantId, isAuthenticated } = useAuthStore();
  const { setTenant } = useTenantStore();
  
  return useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: fetchTenantData,
    enabled: isAuthenticated && !!tenantId,
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