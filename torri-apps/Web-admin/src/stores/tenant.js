import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTenantStore = create(
  persist(
    (set) => ({
      tenantId: null,
      tenantName: null,
      setTenant: (tenantId, tenantName) => set({ tenantId, tenantName }),
      clearTenant: () => set({ tenantId: null, tenantName: null }),
    }),
    {
      name: 'tenant-storage',
      partialize: (state) => ({
        tenantId: state.tenantId,
        tenantName: state.tenantName,
      }),
    }
  )
);
