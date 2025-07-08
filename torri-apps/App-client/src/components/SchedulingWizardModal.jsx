/**
 * SchedulingWizardModal Component (Web Version)
 * Maintains identical modal behavior from Mobile-client-core
 * Features: Bottom sheet modal, slide animations, backdrop dismissal
 */

import React, { useEffect, useState } from 'react';
import { useWizardStore } from '../stores/wizardStore';
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
    canProceedToStep
  } = useWizardStore();

  // Initialize wizard when modal opens
  useEffect(() => {
    if (isVisible) {
      if (selectedServices?.length > 0) {
        // If services are pre-selected, skip to date selection
        const wizardServices = selectedServices.map(service => ({
          id: service.id,
          name: service.name,
          duration_minutes: service.duration_minutes,
          price: parseFloat(service.price),
          parallelable: service.parallelable ?? false,
          max_parallel_pros: service.max_parallel_pros ?? 1,
        }));
        
        initializeWizard(wizardServices);
      } else {
        // Start with empty wizard for service selection
        initializeWizard([]);
      }
    }
  }, [isVisible, selectedServices, initializeWizard]);

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
    if (currentStep === 1) {
      // First step - close modal and reset wizard
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

  // Get step title
  const getStepTitle = (step) => {
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
  };

  // Render current step
  const renderCurrentStep = () => {
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
            currentStep={currentStep}
            totalSteps={6}
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