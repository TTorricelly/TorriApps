/**
 * Wizard Store for Scheduling Flow
 * Maintains identical business logic from Mobile-client-core wizardStore.js
 * Handles multi-step wizard state management with persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWizardStore = create(
  persist(
    (set, get) => ({
      // Current state
      currentStep: 1,
      isLoading: false,
      error: null,
      
      // Step 1: Client selection
      clientData: {
        id: null,
        name: '',
        nickname: '',
        phone: '',
        email: '',
        cpf: '',
        address_cep: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        isNewClient: false
      },
      
      // Step 2: Service selection
      selectedServices: [],
      
      // Step 3: Date selection
      selectedDate: null,
      availableDates: [],
      currentMonth: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      },
      
      // Step 4: Professional selection  
      professionalsRequested: 1,
      maxParallelPros: 2,
      defaultProsRequested: 1,
      selectedProfessionals: [],
      availableProfessionals: [],
      
      // Step 5: Time slot selection
      availableSlots: [],
      selectedSlot: null,
      
      // Step 6: Confirmation
      notes: '',
      isBooking: false,
      bookingResult: null,

      // Step validation (updated for 6-step flow)
      canProceedToStep: (step) => {
        const state = get();
        switch (step) {
          case 1:
            return true;
          case 2:
            return state.clientData.id || state.clientData.name.trim();
          case 3:
            return (state.clientData.id || state.clientData.name.trim()) && state.selectedServices.length > 0;
          case 4:
            return state.selectedServices.length > 0 && state.selectedDate !== null;
          case 5:
            return (
              state.selectedServices.length > 0 &&
              state.selectedDate !== null &&
              state.selectedProfessionals.length === state.professionalsRequested &&
              state.selectedProfessionals.every(prof => prof !== null && prof !== undefined)
            );
          case 6:
            return state.selectedSlot !== null && state.canProceedToStep(5);
          default:
            return false;
        }
      },

      // Actions - Step Management
      setCurrentStep: (step) => set({ currentStep: step }),
      
      goToNextStep: () => set((state) => ({ 
        currentStep: Math.min(state.currentStep + 1, 6) 
      })),
      
      goToPreviousStep: () => set((state) => ({ 
        currentStep: Math.max(state.currentStep - 1, 1) 
      })),

      // Actions - Loading & Error
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Actions - Client Data (Step 1)
      setClientData: (clientData) => set({ 
        clientData: clientData,
        error: null 
      }),

      // Actions - Services (Step 2)
      setSelectedServices: (services) => set({ 
        selectedServices: services,
        selectedDate: null,
        availableDates: [],
        selectedProfessionals: [],
        availableProfessionals: [],
        availableSlots: [],
        selectedSlot: null,
        error: null
      }),

      // Actions - Date Selection (Step 3)
      setSelectedDate: (date) => set({ 
        selectedDate: date,
        selectedProfessionals: [],
        availableProfessionals: [],
        availableSlots: [],
        selectedSlot: null,
        error: null
      }),

      setAvailableDates: (dates) => set({ availableDates: dates }),
      
      setCurrentMonth: (month) => set({ currentMonth: month }),

      // Actions - Professional Selection (Step 2)
      setProfessionalsRequested: (count) => set({ 
        professionalsRequested: count,
        selectedProfessionals: new Array(count).fill(null),
        availableSlots: [],
        selectedSlot: null
      }),

      setSelectedProfessionals: (professionals) => set({ 
        selectedProfessionals: professionals,
        availableSlots: [],
        selectedSlot: null
      }),

      setAvailableProfessionals: (professionals) => set({ 
        availableProfessionals: professionals 
      }),

      setMaxParallelPros: (maxPros) => set({ maxParallelPros: maxPros }),

      setDefaultProsRequested: (defaultPros) => set({ defaultProsRequested: defaultPros }),

      updateSelectedProfessional: (index, professional) => {
        const state = get();
        const newProfessionals = [...state.selectedProfessionals];
        newProfessionals[index] = professional;
        set({ 
          selectedProfessionals: newProfessionals,
          availableSlots: [],
          selectedSlot: null
        });
      },

      // Actions - Time Slot Selection (Step 3)
      setAvailableSlots: (slots) => set({ availableSlots: slots }),
      setSelectedSlot: (slot) => set({ selectedSlot: slot }),

      // Actions - Confirmation (Step 4)
      setNotes: (notes) => set({ notes }),
      setIsBooking: (booking) => set({ isBooking: booking }),
      setBookingResult: (result) => set({ bookingResult: result }),

      // Helper functions (identical to mobile)
      getTotalEstimatedTime: () => {
        const state = get();
        return state.selectedServices.reduce((total, service) => {
          return total + (service.duration_minutes || 0);
        }, 0);
      },

      getTotalPrice: () => {
        const state = get();
        return state.selectedServices.reduce((total, service) => {
          return total + (service.price || 0);
        }, 0);
      },

      // Reset wizard state
      resetWizard: () => set({
        currentStep: 1,
        isLoading: false,
        error: null,
        selectedServices: [],
        selectedDate: null,
        availableDates: [],
        professionalsRequested: 1,
        maxParallelPros: 2,
        defaultProsRequested: 1,
        selectedProfessionals: [],
        availableProfessionals: [],
        availableSlots: [],
        selectedSlot: null,
        notes: '',
        isBooking: false,
        bookingResult: null
      }),

      // Initialize wizard with services
      initializeWizard: (services) => {
        set({
          selectedServices: services,
          currentStep: 1,
          selectedDate: null,
          availableDates: [],
          selectedProfessionals: [],
          availableProfessionals: [],
          availableSlots: [],
          selectedSlot: null,
          error: null
        });
      },

      // Reset wizard from specific step (used when changing earlier selections)
      resetFromStep: (step) => {
        const updates = { error: null };
        
        if (step <= 2) {
          Object.assign(updates, {
            selectedProfessionals: [],
            availableProfessionals: [],
            availableSlots: [],
            selectedSlot: null,
          });
        }
        
        if (step <= 3) {
          Object.assign(updates, {
            availableSlots: [],
            selectedSlot: null,
          });
        }
        
        if (step <= 4) {
          Object.assign(updates, {
            notes: '',
            isBooking: false,
            bookingResult: null
          });
        }
        
        set(updates);
      }
    }),
    {
      name: 'torri-wizard-storage',
      partialize: (state) => ({
        selectedServices: state.selectedServices,
        selectedDate: state.selectedDate,
        professionalsRequested: state.professionalsRequested,
        selectedProfessionals: state.selectedProfessionals,
        selectedSlot: state.selectedSlot,
        notes: state.notes
      })
    }
  )
);