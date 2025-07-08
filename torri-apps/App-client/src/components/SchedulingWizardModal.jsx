/**
 * SchedulingWizardModal Component (Web Version)
 * Maintains identical modal behavior from Mobile-client-core
 * Features: Bottom sheet modal, slide animations, backdrop dismissal
 */

import React, { useEffect, useState } from 'react';
import { useWizardStore } from '../stores/wizardStore';
import { useAuthStore } from '../stores/authStore';
import { useViewModeStore } from '../stores/viewModeStore';
import WizardHeader from './WizardHeader';
import WizardClientScreen from './wizard/WizardClientScreen';
import WizardServiceScreen from './wizard/WizardServiceScreen';
import WizardDateScreen from './wizard/WizardDateScreen';
import WizardProfessionalsScreen from './wizard/WizardProfessionalsScreen';
import WizardSlotsScreen from './wizard/WizardSlotsScreen';
import WizardConfirmationScreen from './wizard/WizardConfirmationScreen';

const SchedulingWizardModal = ({ isVisible, onClose, selectedServices, onAppointmentCreated }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  
  const {
    currentStep,
    initializeWizard,
    resetWizard,
    goToPreviousStep,
    canProceedToStep,
    mode,
    getTotalSteps,
    getStartingStep
  } = useWizardStore();
  
  const { user } = useAuthStore();
  const { currentMode } = useViewModeStore();

  // Initialize wizard when modal opens
  useEffect(() => {
    if (isVisible) {
      // Don't re-initialize if we're at the confirmation step (step 6)
      // This prevents resetting when services are cleared after booking
      if (currentStep === 6) {
        console.log('🚫 Skipping wizard reset - already at confirmation step');
        return;
      }
      
      // Determine mode based on user role and current view mode
      const isProfessional = user?.role === 'PROFISSIONAL' || user?.role === 'ATENDENTE' || user?.role === 'GESTOR';
      const wizardMode = isProfessional && currentMode === 'professional' ? 'professional' : 'client';
      
      // Don't re-initialize if we're already in the wizard flow (past starting step)
      if (wizardMode === 'client' && currentStep > 3) {
        console.log('🚫 Skipping wizard reset - already progressed past starting step:', currentStep);
        return;
      }
      if (wizardMode === 'professional' && currentStep > 1) {
        console.log('🚫 Skipping wizard reset - already progressed past starting step:', currentStep);
        return;
      }
      
      if (selectedServices?.length > 0) {
        // If services are pre-selected, initialize directly with services
        const wizardServices = selectedServices.map(service => ({
          id: service.id,
          name: service.name,
          duration_minutes: service.duration_minutes,
          price: parseFloat(service.price),
          parallelable: service.parallelable ?? false,
          max_parallel_pros: service.max_parallel_pros ?? 1,
        }));
        
        console.log('🔄 Initializing wizard with pre-selected services:', { wizardMode, servicesCount: wizardServices.length });
        initializeWizard(wizardServices, wizardMode);
        
        // Log the state after initialization
        setTimeout(() => {
          const state = useWizardStore.getState();
          console.log('📊 Wizard state after initialization:', {
            currentStep: state.currentStep,
            mode: state.mode,
            selectedServicesCount: state.selectedServices?.length || 0,
            selectedDate: state.selectedDate,
            canProceedToStep4: state.canProceedToStep(4),
            canProceedToStep5: state.canProceedToStep(5)
          });
        }, 100);
      } else {
        // No services - initialize directly (will handle reset internally)
        console.log('🔄 Initializing wizard without services:', { wizardMode });
        initializeWizard([], wizardMode);
      }
    }
  }, [isVisible, selectedServices, initializeWizard, resetWizard, user, currentMode, currentStep]);

  // Handle modal entrance animation
  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scrolling when modal closes
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVisible]);

  // Handle back navigation
  const handleBack = () => {
    const startingStep = getStartingStep();
    if (currentStep === startingStep) {
      // First step for current mode - close modal and reset wizard
      handleClose();
    } else {
      // Other steps - go to previous step
      goToPreviousStep();
    }
  };

  // Handle modal close
  const handleClose = () => {
    setIsAnimating(false);
    resetWizard();
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible]);

  // Get step title based on mode
  const getStepTitle = (step) => {
    if (mode === 'client') {
      // Client mode with pre-selected services: Steps 3-6 (Date → Professionals → Time → Confirmation)
      if (selectedServices?.length > 0) {
        switch (step) {
          case 3:
            return 'Escolher data';
          case 4:
            return 'Escolher profissionais';
          case 5:
            return 'Escolher horário';
          case 6:
            return 'Confirmar agendamento';
          default:
            return 'Agendamento';
        }
      } else {
        // Client mode without services: Steps 2-6 (Services → Date → Professionals → Time → Confirmation)
        switch (step) {
          case 2:
            return 'Escolher serviços';
          case 3:
            return 'Escolher data';
          case 4:
            return 'Escolher profissionais';
          case 5:
            return 'Escolher horário';
          case 6:
            return 'Confirmar agendamento';
          default:
            return 'Agendamento';
        }
      }
    } else {
      // Professional mode: Full flow (Steps 1-6)
      switch (step) {
        case 1:
          return 'Selecionar cliente';
        case 2:
          return 'Escolher serviços';
        case 3:
          return 'Escolher data';
        case 4:
          return 'Escolher profissionais';
        case 5:
          return 'Escolher horário';
        case 6:
          return 'Confirmar agendamento';
        default:
          return 'Agendamento';
      }
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    // Debug log to see what step is actually being rendered
    console.log('🎯 Rendering step:', { currentStep, mode, isVisible });
    
    // In client mode, step 1 is not used, so we need to adjust
    if (mode === 'client' && currentStep === 1) {
      // Should not happen, but fallback to services
      return <WizardServiceScreen />;
    }
    
    switch (currentStep) {
      case 1:
        return <WizardClientScreen />;
      case 2:
        return <WizardServiceScreen />;
      case 3:
        return <WizardDateScreen />;
      case 4:
        return <WizardProfessionalsScreen />;
      case 5:
        return <WizardSlotsScreen />;
      case 6:
        return <WizardConfirmationScreen onAppointmentCreated={onAppointmentCreated} />;
      default:
        return <div className="p-6"><p>Invalid step</p></div>;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={handleBackdropClick}
      />
      
      {/* Modal Content */}
      <div 
        className={`absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ 
          height: 'calc(100vh - 40px)', // Leave small gap at top
          maxHeight: '100vh'
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Wizard Content */}
        <div className="flex flex-col h-full">
          {/* Wizard Header */}
          <WizardHeader
            title={getStepTitle(currentStep)}
            currentStep={mode === 'client' && selectedServices?.length > 0 ? currentStep - 2 : mode === 'client' ? currentStep - 1 : currentStep}
            totalSteps={getTotalSteps()}
            onBack={handleBack}
          />

          {/* Current Step Content */}
          <div className="flex-1 overflow-hidden">
            {renderCurrentStep()}
          </div>
        </div>
      </div>

      {/* Custom Styles for smooth animations */}
      <style>{`
        .modal-enter {
          transform: translateY(100%);
        }
        .modal-enter-active {
          transform: translateY(0);
          transition: transform 300ms ease-out;
        }
        .modal-exit {
          transform: translateY(0);
        }
        .modal-exit-active {
          transform: translateY(100%);
          transition: transform 300ms ease-out;
        }
      `}</style>
    </div>
  );
};

export default SchedulingWizardModal;