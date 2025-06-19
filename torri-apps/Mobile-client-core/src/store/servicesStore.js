import { create } from 'zustand';

const useServicesStore = create((set) => ({
  selectedServices: [],
  
  addService: (service) => set((state) => ({
    selectedServices: [...state.selectedServices, service]
  })),
  
  removeService: (serviceId) => set((state) => ({
    selectedServices: state.selectedServices.filter(s => s.id !== serviceId)
  })),
  
  toggleService: (service) => set((state) => {
    const isSelected = state.selectedServices.some(s => s.id === service.id);
    if (isSelected) {
      return {
        selectedServices: state.selectedServices.filter(s => s.id !== service.id)
      };
    } else {
      return {
        selectedServices: [...state.selectedServices, service]
      };
    }
  }),
  
  clearServices: () => set({ selectedServices: [] }),
  
  getTotalPrice: () => {
    const state = useServicesStore.getState();
    return state.selectedServices.reduce((total, service) => {
      const price = parseFloat(service.price) || 0;
      return total + price;
    }, 0);
  },
  
  getTotalDuration: () => {
    const state = useServicesStore.getState();
    return state.selectedServices.reduce((total, service) => {
      return total + (service.duration_minutes || 0);
    }, 0);
  }
}));

export default useServicesStore;