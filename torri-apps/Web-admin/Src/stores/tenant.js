import {create} from 'zustand';

// Example structure, expand as needed
export const useTenantStore = create(set => ({
  tenantId: null, // or load from somewhere like localStorage initially if applicable
  setTenantId: (id) => set({ tenantId: id }),
}));
