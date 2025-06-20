import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useWizardStore = create(
  persist(
    (set, get) => ({
      // Current state
      currentStep: 1,
      isLoading: false,
      error: null,
      
      // Step 1: Date selection
      selectedServices: [],
      selectedDate: null,
      availableDates: [],
      
      // Step 2: Professional selection
      professionalsRequested: 1,
      maxParallelPros: 2,
      defaultProsRequested: 1,
      selectedProfessionals: [],
      availableProfessionals: [],
      
      // Step 3: Time slot selection
      availableSlots: [],
      selectedSlot: null,
      visibleSlots: 3,
      
      // Final booking
      bookingInProgress: false,
      bookingResult: null,
      
      // Actions
      
      // Step management
      setCurrentStep: (step) => set({ currentStep: step }),
      
      goToStep: (step) => {
        const state = get();
        if (state.canProceedToStep(step)) {
          set({ currentStep: step });
        }
      },
      
      goToNextStep: () => {
        const state = get();
        const nextStep = state.currentStep + 1;
        if (state.canProceedToStep(nextStep)) {
          set({ currentStep: nextStep });
        }
      },
      
      goToPreviousStep: () => {
        const state = get();
        const prevStep = Math.max(1, state.currentStep - 1);
        set({ currentStep: prevStep });
      },
      
      // Loading and error management
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),
      
      // Step 1: Date selection actions
      setSelectedServices: (services) => set({ 
        selectedServices: services,
        // Reset dependent states
        selectedDate: null,
        availableDates: [],
        selectedProfessionals: [],
        availableProfessionals: [],
        availableSlots: [],
        selectedSlot: null,
        error: null
      }),
      
      setSelectedDate: (date) => set({ 
        selectedDate: date,
        // Reset dependent states
        availableSlots: [],
        selectedSlot: null,
        error: null
      }),
      
      setAvailableDates: (dates) => set({ availableDates: dates }),
      
      // Step 2: Professional selection actions
      setProfessionalsRequested: (count) => {
        const state = get();
        set({ 
          professionalsRequested: count,
          // Adjust selected professionals if necessary
          selectedProfessionals: count === 1 
            ? state.selectedProfessionals.slice(0, 1)
            : state.selectedProfessionals,
          // Reset dependent states
          availableSlots: [],
          selectedSlot: null,
          error: null
        });
      },
      
      setMaxParallelPros: (maxPros) => set({ maxParallelPros: maxPros }),
      
      setDefaultProsRequested: (defaultPros) => set({ defaultProsRequested: defaultPros }),
      
      setSelectedProfessionals: (professionals) => set({ 
        selectedProfessionals: professionals,
        // Reset dependent states
        availableSlots: [],
        selectedSlot: null,
        error: null
      }),
      
      setAvailableProfessionals: (professionals) => set({ availableProfessionals: professionals }),
      
      updateSelectedProfessional: (index, professional) => {
        const state = get();
        const newProfessionals = [...state.selectedProfessionals];
        newProfessionals[index] = professional;
        set({ 
          selectedProfessionals: newProfessionals,
          // Reset dependent states
          availableSlots: [],
          selectedSlot: null,
          error: null
        });
      },
      
      // Step 3: Time slot selection actions
      setAvailableSlots: (slots) => set({ 
        availableSlots: slots,
        selectedSlot: null,
        visibleSlots: 3,
        error: null
      }),
      
      setSelectedSlot: (slot) => set({ selectedSlot: slot }),
      
      setVisibleSlots: (count) => set({ visibleSlots: count }),
      
      showMoreSlots: () => {
        const state = get();
        const newVisibleSlots = Math.min(
          state.visibleSlots + 3, 
          state.availableSlots.length
        );
        set({ visibleSlots: newVisibleSlots });
      },
      
      // Booking actions
      setBookingInProgress: (inProgress) => set({ bookingInProgress: inProgress }),
      
      setBookingResult: (result) => set({ bookingResult: result }),
      
      // Validation
      canProceedToStep: (step) => {
        const state = get();
        switch (step) {
          case 1:
            return true; // Can always go to step 1
          case 2:
            return state.selectedServices.length > 0 && state.selectedDate !== null;
          case 3:
            return (
              state.selectedServices.length > 0 &&
              state.selectedDate !== null &&
              state.selectedProfessionals.length === state.professionalsRequested &&
              state.selectedProfessionals.every(prof => prof !== null && prof !== undefined)
            );
          case 4:
            return (
              state.selectedSlot !== null &&
              state.canProceedToStep(3)
            );
          default:
            return false;
        }
      },
      
      isStepComplete: (step) => {
        const state = get();
        switch (step) {
          case 1:
            return state.selectedServices.length > 0 && state.selectedDate !== null;
          case 2:
            return (
              state.selectedProfessionals.length === state.professionalsRequested &&
              state.selectedProfessionals.every(prof => prof !== null && prof !== undefined)
            );
          case 3:
            return state.selectedSlot !== null;
          default:
            return false;
        }
      },
      
      // Helper getters
      getSelectedServiceIds: () => {
        const state = get();
        return state.selectedServices.map(service => service.id);
      },
      
      getSelectedProfessionalIds: () => {
        const state = get();
        return state.selectedProfessionals
          .filter(prof => prof !== null && prof !== undefined)
          .map(prof => prof.id);
      },
      
      getTotalPrice: () => {
        const state = get();
        if (state.selectedSlot) {
          return state.selectedSlot.total_price;
        }
        return state.selectedServices.reduce((total, service) => total + service.price, 0);
      },
      
      getTotalDuration: () => {
        const state = get();
        if (state.selectedSlot) {
          return state.selectedSlot.total_duration_minutes;
        }
        return state.selectedServices.reduce((total, service) => total + service.duration_minutes, 0);
      },
      
      // Reset wizard
      resetWizard: () => set({
        currentStep: 1,
        isLoading: false,
        error: null,
        selectedDate: null,
        availableDates: [],
        professionalsRequested: 1,
        selectedProfessionals: [],
        availableProfessionals: [],
        availableSlots: [],
        selectedSlot: null,
        visibleSlots: 3,
        bookingInProgress: false,
        bookingResult: null
      }),
      
      resetFromStep: (step) => {
        const state = get();
        const updates = { error: null };
        
        if (step <= 1) {
          Object.assign(updates, {
            selectedDate: null,
            availableDates: [],
            selectedProfessionals: [],
            availableProfessionals: [],
            availableSlots: [],
            selectedSlot: null,
            visibleSlots: 3
          });
        }
        
        if (step <= 2) {
          Object.assign(updates, {
            selectedProfessionals: [],
            availableProfessionals: [],
            availableSlots: [],
            selectedSlot: null,
            visibleSlots: 3
          });
        }
        
        if (step <= 3) {
          Object.assign(updates, {
            availableSlots: [],
            selectedSlot: null,
            visibleSlots: 3
          });
        }
        
        set(updates);
      },
      
      // Development helpers
      getDebugState: () => {
        const state = get();
        return {
          currentStep: state.currentStep,
          selectedServices: state.selectedServices.length,
          selectedDate: state.selectedDate,
          professionalsRequested: state.professionalsRequested,
          selectedProfessionals: state.selectedProfessionals.length,
          availableSlots: state.availableSlots.length,
          selectedSlot: !!state.selectedSlot,
          canProceedToNext: state.canProceedToStep(state.currentStep + 1)
        };
      }
    }),
    {
      name: 'wizard-storage',
      // Only persist essential state, not temporary data like loading states
      partialize: (state) => ({
        selectedServices: state.selectedServices,
        selectedDate: state.selectedDate,
        professionalsRequested: state.professionalsRequested,
        selectedProfessionals: state.selectedProfessionals,
        selectedSlot: state.selectedSlot,
        // Don't persist currentStep to always start from step 1
      }),
      // Version for migration compatibility
      version: 1,
    }
  )
);