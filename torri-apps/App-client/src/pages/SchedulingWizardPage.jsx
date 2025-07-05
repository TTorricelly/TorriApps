/**
 * SchedulingWizardPage Component (Web Version)
 * Maintains identical business logic from Mobile-client-core SchedulingWizard
 * Multi-step wizard: Date → Professionals → Time Slots → Confirmation
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useWizardStore } from '../stores/wizardStore';
import useServicesStore from '../stores/servicesStore';
import WizardHeader from '../components/WizardHeader';
import WizardDateScreen from '../components/wizard/WizardDateScreen';
// TODO: Import other wizard screens when created
// import WizardProfessionalsScreen from '../components/wizard/WizardProfessionalsScreen';
// import WizardSlotsScreen from '../components/wizard/WizardSlotsScreen';
// import WizardConfirmationScreen from '../components/wizard/WizardConfirmationScreen';

const SchedulingWizardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantSlug } = useParams();
  const { selectedServices } = useServicesStore();
  
  const {
    currentStep,
    initializeWizard,
    resetWizard,
    goToPreviousStep,
    canProceedToStep
  } = useWizardStore();

  // Initialize wizard with services from route state or services store
  useEffect(() => {
    const servicesFromNavigation = location.state?.services;
    const servicesToUse = servicesFromNavigation || selectedServices;
    
    if (!servicesToUse || servicesToUse.length === 0) {
      // No services selected, redirect back to services page
      navigate(`/${tenantSlug}/services`);
      return;
    }

    // Initialize wizard with services
    initializeWizard(servicesToUse);
  }, [location.state, selectedServices, initializeWizard, navigate]);

  // Handle back navigation
  const handleBack = () => {
    if (currentStep === 1) {
      // First step - go back to services page and reset wizard
      resetWizard();
      navigate(`/${tenantSlug}/services`);
    } else {
      // Other steps - go to previous step
      goToPreviousStep();
    }
  };

  // Get step title
  const getStepTitle = (step) => {
    switch (step) {
      case 1:
        return 'Escolher data';
      case 2:
        return 'Escolher profissionais';
      case 3:
        return 'Escolher horário';
      case 4:
        return 'Confirmar agendamento';
      default:
        return 'Agendamento';
    }
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <WizardDateScreen />;
      case 2:
        // TODO: Implement WizardProfessionalsScreen
        return <div className="p-6"><p>Step 2: Professionals (Coming Soon)</p></div>;
      case 3:
        // TODO: Implement WizardSlotsScreen  
        return <div className="p-6"><p>Step 3: Time Slots (Coming Soon)</p></div>;
      case 4:
        // TODO: Implement WizardConfirmationScreen
        return <div className="p-6"><p>Step 4: Confirmation (Coming Soon)</p></div>;
      default:
        return <div className="p-6"><p>Invalid step</p></div>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Wizard Header */}
      <WizardHeader
        title={getStepTitle(currentStep)}
        currentStep={currentStep}
        totalSteps={4}
        onBack={handleBack}
      />

      {/* Current Step Content */}
      <div className="flex-1 overflow-hidden">
        {renderCurrentStep()}
      </div>
    </div>
  );
};

export default SchedulingWizardPage;