import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';
import { useTenantStore } from '../stores/tenant';

// Mock function to simulate tenant data fetching
// In production, this would be replaced with actual API call
const fetchTenantData = async (tenantId) => {
  if (!tenantId) throw new Error('Tenant ID is required');
  
  // Mock delay to simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock tenant data based on tenantId
  const mockTenants = {
    'tenant1': { id: 'tenant1', name: 'Barbearia do Zé', slug: 'barbearia-do-ze' },
    'tenant2': { id: 'tenant2', name: 'Salão Beleza Pura', slug: 'salao-beleza-pura' },
    'tenant3': { id: 'tenant3', name: 'Studio Hair Fashion', slug: 'studio-hair-fashion' },
    'default': { id: 'default', name: 'TorriApps Demo', slug: 'demo' }
  };
  
  return mockTenants[tenantId] || mockTenants['default'];
  
  // TODO: Replace with actual API call when tenant routes are implemented
  // const response = await api.get(`/tenants/${tenantId}`);
  // return response.data;
};

export const useTenant = () => {
  const { tenantId } = useAuthStore();
  const { setTenant } = useTenantStore();
  
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => fetchTenantData(tenantId),
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    onSuccess: (data) => {
      // Update tenant store with fetched data
      if (data && data.name) {
        setTenant(tenantId, data.name);
      }
    },
    onError: (error) => {
      console.error('Failed to fetch tenant data:', error);
    }
  });
};