/**
 * Wizard Store for Scheduling Flow
 * Maintains identical business logic from Mobile-client-core wizardStore.js
 * Handles multi-step wizard state management with persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useViewModeStore } from './viewModeStore';
import { useAuthStore } from './authStore';

export const useWizardStore = create(
  persist(
    (set, get) => ({
      // Current state
      currentStep: 1,
      isLoading: false,
      error: null,
      mode: 'professional', // 'professional' or 'client'
      
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

      // Mode detection helpers
      isClientMode: () => get().mode === 'client',
      isProfessionalMode: () => get().mode === 'professional',
      
      // Get effective starting step based on mode and services
      getStartingStep: () => {
        const state = get();
        if (state.mode === 'client') {
          // Client mode: If services are pre-selected, skip to date selection
          return state.selectedServices?.length > 0 ? 3 : 2;
        }
        return 1; // Professional mode always starts with client selection
      },
      
      // Get total steps based on mode and services
      getTotalSteps: () => {
        const state = get();
        if (state.mode === 'client') {
          // Client mode: If services pre-selected, 4 steps (Date → Professionals → Time → Confirmation)
          // If no services, 5 steps (Services → Date → Professionals → Time → Confirmation)
          return state.selectedServices?.length > 0 ? 4 : 5;
        }
        return 6; // Professional mode has full 6 steps
      },

      // Step validation (updated for mode-specific flow)
      canProceedToStep: (step) => {
        const state = get();
        
        if (state.mode === 'client') {
          // Client mode with pre-selected services: Steps 3-6 (Date → Professionals → Time → Confirmation)
          if (state.selectedServices?.length > 0) {
            switch (step) {
              case 3:
                return true; // Date step
              case 4:
                return state.selectedDate !== null;
              case 5:
                return (
                  state.selectedDate !== null &&
                  state.selectedProfessionals.length === state.professionalsRequested &&
                  state.selectedProfessionals.every(prof => prof !== null && prof !== undefined)
                );
              case 6:
                return state.selectedSlot !== null && state.canProceedToStep(5);
              default:
                return false;
            }
          } else {
            // Client mode without services: Steps 2-6 (Services → Date → Professionals → Time → Confirmation)
            switch (step) {
              case 2:
                return true; // Services step
              case 3:
                return state.selectedServices.length > 0;
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
          }
        } else {
          // Professional mode: Steps 1-6 (full flow)
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
        }
      },

      // Actions - Step Management
      setCurrentStep: (step) => set({ currentStep: step }),
      
      setMode: (mode) => set({ mode }),
      
      goToNextStep: () => set((state) => ({ 
        currentStep: Math.min(state.currentStep + 1, state.mode === 'client' ? 6 : 6) 
      })),
      
      goToPreviousStep: () => set((state) => {
        let minStep = 1;
        if (state.mode === 'client') {
          minStep = state.selectedServices?.length > 0 ? 3 : 2;
        }
        return { currentStep: Math.max(state.currentStep - 1, minStep) };
      }),

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
      resetWizard: () => {
        const state = get();
        // Calculate starting step before clearing state
        let startingStep = 1; // Professional mode default
        if (state.mode === 'client') {
          startingStep = state.selectedServices?.length > 0 ? 3 : 2;
        }
        
        set({
          currentStep: startingStep,
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
          bookingResult: null,
          // Reset client data in professional mode, keep in client mode
          clientData: state.mode === 'professional' ? {
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
          } : state.clientData
        });
      },

      // Initialize wizard with services and mode
      initializeWizard: (services, mode = 'professional') => {
        const state = get();
        // Calculate starting step based on mode and services
        let startingStep = 1; // Professional mode default
        if (mode === 'client') {
          startingStep = services?.length > 0 ? 3 : 2; // Skip to date if services provided
        }
        
        // Auto-populate client data in client mode
        let clientData = state.clientData;
        if (mode === 'client') {
          // Get current user data from auth store
          const user = useAuthStore.getState().user;
          if (user) {
            clientData = {
              id: user.id,
              name: user.name || '',
              nickname: user.nickname || '',
              phone: user.phone || '',
              email: user.email || '',
              cpf: user.cpf || '',
              address_cep: user.address_cep || '',
              address_street: user.address_street || '',
              address_number: user.address_number || '',
              address_complement: user.address_complement || '',
              address_neighborhood: user.address_neighborhood || '',
              address_city: user.address_city || '',
              address_state: user.address_state || '',
              isNewClient: false
            };
          }
        }
        
        set({
          selectedServices: services,
          currentStep: startingStep,
          mode: mode,
          clientData: clientData,
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