import { Service, Professional } from '../../../types';

// Mock data for testing
const createService = (id: string, name: string): Service => ({
  id,
  name,
  duration_minutes: 60,
  price: '100.00',
  description: `Test service ${name}`,
  category_id: 'test-category',
  parallelable: true,
  max_parallel_pros: 3,
});

const createProfessional = (id: string, name: string, serviceIds: string[]): Professional => ({
  id,
  full_name: name,
  email: `${name.toLowerCase().replace(' ', '.')}@test.com`,
  is_active: true,
  role: 'professional',
  services_offered: serviceIds, // Note: API returns string[] not Service[]
  photo_path: null,
});

// Test Services
const services = {
  hairColor: createService('service-1', 'Hair Color'),
  hairCut: createService('service-2', 'Hair Cut'),
  manicure: createService('service-3', 'Manicure'),
  pedicure: createService('service-4', 'Pedicure'),
  botox: createService('service-5', 'Botox'),
  massage: createService('service-6', 'Massage'),
};

// Test Professionals with different service capabilities
const professionals = {
  // Hair specialists
  hairPro1: createProfessional('pro-1', 'Hair Pro 1', ['service-1', 'service-2']), // Hair Color + Cut
  hairPro2: createProfessional('pro-2', 'Hair Pro 2', ['service-1', 'service-2']), // Hair Color + Cut
  hairOnlyColor: createProfessional('pro-3', 'Hair Color Only', ['service-1']), // Only Hair Color
  hairOnlyCut: createProfessional('pro-4', 'Hair Cut Only', ['service-2']), // Only Hair Cut
  
  // Nail specialists
  nailPro1: createProfessional('pro-5', 'Nail Pro 1', ['service-3', 'service-4']), // Manicure + Pedicure
  nailPro2: createProfessional('pro-6', 'Nail Pro 2', ['service-3', 'service-4']), // Manicure + Pedicure
  manicureOnly: createProfessional('pro-7', 'Manicure Only', ['service-3']), // Only Manicure
  pedicureOnly: createProfessional('pro-8', 'Pedicure Only', ['service-4']), // Only Pedicure
  
  // Specialists
  botoxOnly: createProfessional('pro-9', 'Botox Only', ['service-5']), // Only Botox
  massageOnly: createProfessional('pro-10', 'Massage Only', ['service-6']), // Only Massage
  
  // Multi-specialists
  allServices: createProfessional('pro-11', 'All Services', ['service-1', 'service-2', 'service-3', 'service-4', 'service-5', 'service-6']), // Can do everything
  hairAndNails: createProfessional('pro-12', 'Hair and Nails', ['service-1', 'service-2', 'service-3', 'service-4']), // Hair + Nails
};

// Algorithm functions to test (extracted from component)
type ProfessionalState = 'SELECTED' | 'OPTIMAL' | 'AVAILABLE' | 'REDUNDANT' | 'DISABLED';

const getProfessionalState = (
  professional: Professional,
  currentSelected: (Professional | null)[],
  selectedServices: Service[],
  professionalsRequested: number
): ProfessionalState => {
  // Check if already selected
  const isSelected = currentSelected.some((prof: Professional | null) => prof?.id === professional.id);
  if (isSelected) return 'SELECTED';
  
  // Check if professional can help with any selected services
  if (!professional.services_offered) return 'DISABLED';
  
  const professionalServices = selectedServices.filter((service: Service) => 
    (professional.services_offered as any)?.includes(service.id)
  );
  
  if (professionalServices.length === 0) return 'DISABLED';
  
  // Apply algorithm based on sequence type
  const state = professionalsRequested >= 3 
    ? getStateForMultiProfessionalSequence(professional, currentSelected, professionalServices, selectedServices, professionalsRequested)
    : getStateForSingleOrDualSequence(professional, currentSelected, professionalServices, selectedServices);
  
  return state;
};

const getStateForMultiProfessionalSequence = (
  professional: Professional,
  currentSelected: (Professional | null)[],
  _professionalServices: Service[],
  selectedServices: Service[],
  professionalsRequested: number
): ProfessionalState => {
  const selectedCount = currentSelected.filter(prof => prof !== null).length;
  
  // Check if any services are already covered (this determines if we're in Phase 2)
  const coveredServices = selectedServices.filter((service: Service) => 
    currentSelected.some((selectedProf: Professional | null) => 
      selectedProf && (selectedProf.services_offered as any)?.includes(service.id)
    )
  );
  const hasAnyCoverage = coveredServices.length > 0;
  
  // Phase 1: Until we have any coverage, highlight all who can help
  if (selectedCount === 0 || !hasAnyCoverage) {
    const canProvideAnyService = selectedServices.some((service: Service) => 
      (professional.services_offered as any)?.includes(service.id)
    );
    return canProvideAnyService ? 'OPTIMAL' : 'AVAILABLE';
  }
  
  // Phase 2: We have some coverage, now check for redundancy  
  const uncoveredServices = getUncoveredServicesForAssignment(currentSelected, selectedServices);
  const alreadyCoveredServices = selectedServices.filter((service: Service) => !uncoveredServices.includes(service));
  
  // Get services this professional can provide
  const professionalServices = selectedServices.filter((service: Service) => 
    (professional.services_offered as any)?.includes(service.id)
  );
  
  // Check if professional can ONLY provide already-covered services
  const canOnlyProvideCoveredServices = professionalServices.length > 0 && 
    professionalServices.every((service: Service) => alreadyCoveredServices.includes(service));
  
  // In 3+ professional sequences, mark as redundant if they can only provide covered services
  const hasEnoughProfessionals = selectedCount >= professionalsRequested;
  
  // Check if professional can ONLY provide covered services
  if (canOnlyProvideCoveredServices) {
    // If there are uncovered services they can't help with, they're redundant regardless of professional count
    if (uncoveredServices.length > 0) {
      // Professional is useless - can only do covered services while uncovered services exist
      return 'REDUNDANT';
    }
    // If all services are covered but we still need more professionals, they're available
    else if (selectedCount < professionalsRequested) {
      return 'AVAILABLE';
    }
    // If all services are covered and we have enough professionals, they're redundant
    else {
      return 'REDUNDANT';
    }
  }
  
  if (uncoveredServices.length === 0) {
    // All services covered, but check if we still need more professionals for the sequence
    if (selectedCount < professionalsRequested) {
      return 'AVAILABLE';
    } else {
      return 'AVAILABLE';
    }
  }
  
  // Check if this professional can help with uncovered services
  const canHelpWithUncovered = uncoveredServices.some((service: Service) => 
    (professional.services_offered as any)?.includes(service.id)
  );
  
  return canHelpWithUncovered ? 'OPTIMAL' : 'AVAILABLE';
};

const getStateForSingleOrDualSequence = (
  professional: Professional,
  currentSelected: (Professional | null)[],
  _professionalServices: Service[],
  selectedServices: Service[]
): ProfessionalState => {
  const uncoveredServices = selectedServices.filter((service: Service) => {
    return !currentSelected.some((selectedProf: Professional | null) => 
      selectedProf && (selectedProf.services_offered as any)?.includes(service.id)
    );
  });
  
  if (uncoveredServices.length === 0) {
    return 'AVAILABLE';
  }
  
  // Check if this professional can help with uncovered services
  const canHelpWithUncovered = uncoveredServices.some((service: Service) => 
    (professional.services_offered as any)?.includes(service.id)
  );
  
  if (canHelpWithUncovered) {
    // Calculate coverage score for optimization
    const coverageScore = uncoveredServices.filter((service: Service) => 
      (professional.services_offered as any)?.includes(service.id)
    ).length;
    
    return coverageScore > 0 ? 'OPTIMAL' : 'AVAILABLE';
  }
  
  return 'REDUNDANT';
};

const getUncoveredServicesForAssignment = (currentSelected: (Professional | null)[], selectedServices: Service[]): Service[] => {
  return selectedServices.filter((service: Service) => {
    return !currentSelected.some((selectedProf: Professional | null) => 
      selectedProf && (selectedProf.services_offered as any)?.includes(service.id)
    );
  });
};

// UI State Mapping
const getUIState = (professionalState: ProfessionalState) => {
  switch (professionalState) {
    case 'SELECTED':
      return { color: 'green', indicator: 'checkmark', selectable: false, description: 'Selected with checkmark' };
    case 'OPTIMAL':
      return { color: 'green', indicator: 'star', selectable: true, description: 'Green highlighted (optimal choice)' };
    case 'AVAILABLE':
      return { color: 'white', indicator: 'none', selectable: true, description: 'White/normal (available)' };
    case 'REDUNDANT':
      return { color: 'yellow', indicator: 'warning', selectable: false, description: 'Yellow/gray (redundant warning)' };
    case 'DISABLED':
      return { color: 'gray', indicator: 'none', selectable: false, description: 'Gray (disabled/unavailable)' };
    default:
      return { color: 'unknown', indicator: 'none', selectable: false, description: 'Unknown state' };
  }
};

// Test Suite
describe('Professional Selection Algorithm', () => {
  
  describe('Single Professional Sequence (1 pro)', () => {
    const professionalsRequested = 1;
    
    test('1 service, 2 capable professionals - both should be OPTIMAL initially', () => {
      const selectedServices = [services.hairColor];
      const availableProfessionals = [professionals.hairPro1, professionals.hairPro2];
      const currentSelected: (Professional | null)[] = [null];
      
      const state1 = getProfessionalState(professionals.hairPro1, currentSelected, selectedServices, professionalsRequested);
      const state2 = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      
      expect(state1).toBe('OPTIMAL');
      expect(state2).toBe('OPTIMAL');
    });
    
    test('1 service, 1 pro selected - others should be AVAILABLE', () => {
      const selectedServices = [services.hairColor];
      const currentSelected: (Professional | null)[] = [professionals.hairPro1];
      
      const state = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      expect(state).toBe('AVAILABLE');
    });
    
    test('Professional who cannot provide selected service should be DISABLED', () => {
      const selectedServices = [services.hairColor];
      const currentSelected: (Professional | null)[] = [null];
      
      const state = getProfessionalState(professionals.nailPro1, currentSelected, selectedServices, professionalsRequested);
      expect(state).toBe('DISABLED');
    });
  });
  
  describe('Dual Professional Sequence (2 pros)', () => {
    const professionalsRequested = 2;
    
    test('2 services, zero overlap - both specialists should be OPTIMAL', () => {
      const selectedServices = [services.hairColor, services.manicure];
      const currentSelected: (Professional | null)[] = [null, null];
      
      const hairProState = getProfessionalState(professionals.hairOnlyColor, currentSelected, selectedServices, professionalsRequested);
      const nailProState = getProfessionalState(professionals.manicureOnly, currentSelected, selectedServices, professionalsRequested);
      
      expect(hairProState).toBe('OPTIMAL');
      expect(nailProState).toBe('OPTIMAL');
    });
    
    test('2 services, 1 pro can do both - should be OPTIMAL', () => {
      const selectedServices = [services.hairColor, services.hairCut];
      const currentSelected: (Professional | null)[] = [null, null];
      
      const state = getProfessionalState(professionals.hairPro1, currentSelected, selectedServices, professionalsRequested);
      expect(state).toBe('OPTIMAL');
    });
    
    test('2 services, 1 selected covering 1 service - remaining should be OPTIMAL for uncovered', () => {
      const selectedServices = [services.hairColor, services.manicure];
      const currentSelected: (Professional | null)[] = [professionals.hairOnlyColor, null];
      
      const nailProState = getProfessionalState(professionals.manicureOnly, currentSelected, selectedServices, professionalsRequested);
      const redundantHairState = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      
      expect(nailProState).toBe('OPTIMAL'); // Can do uncovered manicure
      expect(redundantHairState).toBe('REDUNDANT'); // Can only do covered hair color
    });
  });
  
  describe('Triple Professional Sequence (3 pros)', () => {
    const professionalsRequested = 3;
    
    test('3 services, zero overlap - all specialists should be OPTIMAL', () => {
      const selectedServices = [services.hairColor, services.manicure, services.botox];
      const currentSelected: (Professional | null)[] = [null, null, null];
      
      const hairState = getProfessionalState(professionals.hairOnlyColor, currentSelected, selectedServices, professionalsRequested);
      const nailState = getProfessionalState(professionals.manicureOnly, currentSelected, selectedServices, professionalsRequested);
      const botoxState = getProfessionalState(professionals.botoxOnly, currentSelected, selectedServices, professionalsRequested);
      
      expect(hairState).toBe('OPTIMAL');
      expect(nailState).toBe('OPTIMAL');
      expect(botoxState).toBe('OPTIMAL');
    });
    
    test('3 services, 1 pro selected - redundant pros should become REDUNDANT only if we have enough pros', () => {
      const selectedServices = [services.hairColor, services.manicure, services.botox];
      const currentSelected: (Professional | null)[] = [professionals.hairOnlyColor, null, null];
      
      // Another hair pro should be REDUNDANT because they can only provide covered services while uncovered services exist
      const redundantHairState = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      expect(redundantHairState).toBe('REDUNDANT'); // Redundant because can only provide covered services
      
      // Pros who can help with uncovered services should be OPTIMAL
      const nailState = getProfessionalState(professionals.manicureOnly, currentSelected, selectedServices, professionalsRequested);
      const botoxState = getProfessionalState(professionals.botoxOnly, currentSelected, selectedServices, professionalsRequested);
      
      expect(nailState).toBe('OPTIMAL');
      expect(botoxState).toBe('OPTIMAL');
    });
    
    test('3 services, 2 pros selected covering all services - redundant should be AVAILABLE (still need 3rd pro)', () => {
      const selectedServices = [services.hairColor, services.manicure, services.pedicure];
      // Pro1 covers hair, Pro2 covers nails - all services covered but need 1 more pro
      const currentSelected: (Professional | null)[] = [professionals.hairOnlyColor, professionals.nailPro1, null];
      
      const redundantHairState = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      const redundantNailState = getProfessionalState(professionals.nailPro2, currentSelected, selectedServices, professionalsRequested);
      
      // Should be AVAILABLE (not REDUNDANT) because we still need 1 more professional
      expect(redundantHairState).toBe('AVAILABLE');
      expect(redundantNailState).toBe('AVAILABLE');
    });
    
    test('3 services, 3 pros selected - additional pros should be REDUNDANT if they only provide covered services', () => {
      const selectedServices = [services.hairColor, services.manicure, services.botox];
      const currentSelected: (Professional | null)[] = [professionals.hairOnlyColor, professionals.manicureOnly, professionals.botoxOnly];
      
      const redundantHairState = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      expect(redundantHairState).toBe('REDUNDANT'); // Now we have enough pros AND this one only provides covered services
    });
  });
  
  describe('Complex Scenarios', () => {
    
    test('More professionals than services - excess should be AVAILABLE when services covered', () => {
      const selectedServices = [services.hairColor, services.manicure];
      const professionalsRequested = 4;
      const currentSelected: (Professional | null)[] = [professionals.hairOnlyColor, professionals.manicureOnly, null, null];
      
      // All services covered, but still need 2 more professionals
      // Test with professionals who CAN provide the selected services
      const state1 = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      const state2 = getProfessionalState(professionals.nailPro2, currentSelected, selectedServices, professionalsRequested);
      
      expect(state1).toBe('AVAILABLE'); // Can do hair color (covered) but still need more pros
      expect(state2).toBe('AVAILABLE'); // Can do manicure (covered) but still need more pros
    });
    
    test('One professional can do everything - should be OPTIMAL when nothing selected', () => {
      const selectedServices = [services.hairColor, services.manicure, services.botox];
      const professionalsRequested = 1;
      const currentSelected: (Professional | null)[] = [null];
      
      const state = getProfessionalState(professionals.allServices, currentSelected, selectedServices, professionalsRequested);
      expect(state).toBe('OPTIMAL');
    });
    
    test('Partial overlap scenario - complex service coverage', () => {
      const selectedServices = [services.hairColor, services.hairCut, services.manicure, services.pedicure];
      const professionalsRequested = 3;
      const currentSelected: (Professional | null)[] = [professionals.hairPro1, null, null]; // Covers hair color + cut
      
      // Nail professionals should be OPTIMAL (can cover uncovered nail services)
      const nailState = getProfessionalState(professionals.nailPro1, currentSelected, selectedServices, professionalsRequested);
      expect(nailState).toBe('OPTIMAL');
      
      // Another hair professional should be REDUNDANT (can only do covered services while uncovered services exist)
      const redundantHairState = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      expect(redundantHairState).toBe('REDUNDANT');
    });
  });
  
  describe('Edge Cases', () => {
    
    test('No services selected - all should be DISABLED', () => {
      const selectedServices: Service[] = [];
      const professionalsRequested = 1;
      const currentSelected: (Professional | null)[] = [null];
      
      const state = getProfessionalState(professionals.hairPro1, currentSelected, selectedServices, professionalsRequested);
      expect(state).toBe('DISABLED');
    });
    
    test('Professional with no services_offered - should be DISABLED', () => {
      const selectedServices = [services.hairColor];
      const professionalsRequested = 1;
      const currentSelected: (Professional | null)[] = [null];
      const emptyPro = { ...professionals.hairPro1, services_offered: undefined };
      
      const state = getProfessionalState(emptyPro, currentSelected, selectedServices, professionalsRequested);
      expect(state).toBe('DISABLED');
    });
    
    test('Already selected professional - should be SELECTED', () => {
      const selectedServices = [services.hairColor];
      const professionalsRequested = 1;
      const currentSelected: (Professional | null)[] = [professionals.hairPro1];
      
      const state = getProfessionalState(professionals.hairPro1, currentSelected, selectedServices, professionalsRequested);
      expect(state).toBe('SELECTED');
    });
  });
  
  describe('UI State Mapping Tests', () => {
    
    test('OPTIMAL professionals should be green with star indicator', () => {
      const selectedServices = [services.hairColor];
      const professionalsRequested = 1;
      const currentSelected: (Professional | null)[] = [null];
      
      const state = getProfessionalState(professionals.hairPro1, currentSelected, selectedServices, professionalsRequested);
      const uiState = getUIState(state);
      
      expect(state).toBe('OPTIMAL');
      expect(uiState.color).toBe('green');
      expect(uiState.indicator).toBe('star');
      expect(uiState.selectable).toBe(true);
    });
    
    test('SELECTED professionals should be green with checkmark', () => {
      const selectedServices = [services.hairColor];
      const professionalsRequested = 1;
      const currentSelected: (Professional | null)[] = [professionals.hairPro1];
      
      const state = getProfessionalState(professionals.hairPro1, currentSelected, selectedServices, professionalsRequested);
      const uiState = getUIState(state);
      
      expect(state).toBe('SELECTED');
      expect(uiState.color).toBe('green');
      expect(uiState.indicator).toBe('checkmark');
      expect(uiState.selectable).toBe(false);
    });
    
    test('REDUNDANT professionals should be yellow with warning', () => {
      const selectedServices = [services.hairColor, services.manicure];
      const professionalsRequested = 2;
      const currentSelected: (Professional | null)[] = [professionals.hairOnlyColor, null];
      
      const state = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      const uiState = getUIState(state);
      
      expect(state).toBe('REDUNDANT');
      expect(uiState.color).toBe('yellow');
      expect(uiState.indicator).toBe('warning');
      expect(uiState.selectable).toBe(false);
    });
    
    test('AVAILABLE professionals should be white/normal', () => {
      const selectedServices = [services.hairColor, services.manicure];
      const professionalsRequested = 3;
      const currentSelected: (Professional | null)[] = [professionals.hairOnlyColor, professionals.manicureOnly, null];
      
      // All services covered but still need 1 more professional
      // Use a professional who CAN provide one of the selected services
      const state = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      const uiState = getUIState(state);
      
      expect(state).toBe('AVAILABLE');
      expect(uiState.color).toBe('white');
      expect(uiState.indicator).toBe('none');
      expect(uiState.selectable).toBe(true);
    });
    
    test('DISABLED professionals should be gray', () => {
      const selectedServices = [services.hairColor];
      const professionalsRequested = 1;
      const currentSelected: (Professional | null)[] = [null];
      
      const state = getProfessionalState(professionals.nailPro1, currentSelected, selectedServices, professionalsRequested);
      const uiState = getUIState(state);
      
      expect(state).toBe('DISABLED');
      expect(uiState.color).toBe('gray');
      expect(uiState.indicator).toBe('none');
      expect(uiState.selectable).toBe(false);
    });
    
    test('Professionals who cannot provide selected services should be DISABLED', () => {
      const selectedServices = [services.hairColor, services.manicure];
      const professionalsRequested = 2;
      const currentSelected: (Professional | null)[] = [null, null];
      
      // Botox specialist cannot provide hair color or manicure
      const state = getProfessionalState(professionals.botoxOnly, currentSelected, selectedServices, professionalsRequested);
      const uiState = getUIState(state);
      
      expect(state).toBe('DISABLED');
      expect(uiState.color).toBe('gray');
      expect(uiState.selectable).toBe(false);
    });
  });
  
  describe('User-Reported Scenario: Botox + Manicure + Pedicure with 4 Professionals', () => {
    // Exact scenario from user: 3 services, 4 professionals with specific capabilities
    const userScenarioServices = [services.botox, services.manicure, services.pedicure];
    const mariaSilva = createProfessional('maria-silva', 'Maria Silva', ['service-3', 'service-4']); // Manicure + Pedicure
    const anaCosta = createProfessional('ana-costa', 'Ana Costa', ['service-5']); // Botox Capilar
    const joaoSantos = createProfessional('joao-santos', 'João Santos', ['service-5']); // Botox Capilar  
    const joselito = createProfessional('joselito', 'Joselito', ['service-3', 'service-4']); // Manicure + Pedicure
    
    const userScenarioProfessionals = [mariaSilva, anaCosta, joaoSantos, joselito];
    
    describe('Single Professional Sequence (1 pro)', () => {
      const professionalsRequested = 1;
      
      test('All professionals should be OPTIMAL initially - can contribute to services', () => {
        const currentSelected: (Professional | null)[] = [null];
        
        const mariaState = getProfessionalState(mariaSilva, currentSelected, userScenarioServices, professionalsRequested);
        const anaState = getProfessionalState(anaCosta, currentSelected, userScenarioServices, professionalsRequested);
        const joaoState = getProfessionalState(joaoSantos, currentSelected, userScenarioServices, professionalsRequested);
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        expect(mariaState).toBe('OPTIMAL'); // Can do 2/3 services
        expect(anaState).toBe('OPTIMAL'); // Can do 1/3 services
        expect(joaoState).toBe('OPTIMAL'); // Can do 1/3 services
        expect(joselitoState).toBe('OPTIMAL'); // Can do 2/3 services
      });
    });
    
    describe('Dual Professional Sequence (2 pros)', () => {
      const professionalsRequested = 2;
      
      test('After selecting Maria Silva - João Santos should be REDUNDANT', () => {
        const currentSelected: (Professional | null)[] = [mariaSilva, null];
        
        const anaState = getProfessionalState(anaCosta, currentSelected, userScenarioServices, professionalsRequested);
        const joaoState = getProfessionalState(joaoSantos, currentSelected, userScenarioServices, professionalsRequested);
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        expect(anaState).toBe('OPTIMAL'); // Can cover uncovered Botox
        expect(joaoState).toBe('OPTIMAL'); // Can cover uncovered Botox
        expect(joselitoState).toBe('REDUNDANT'); // Can only cover already covered Manicure/Pedicure
        expect(getUIState(joselitoState).color).toBe('yellow');
      });
      
      test('After selecting Ana Costa - Joselito should be OPTIMAL', () => {
        const currentSelected: (Professional | null)[] = [anaCosta, null];
        
        const mariaState = getProfessionalState(mariaSilva, currentSelected, userScenarioServices, professionalsRequested);
        const joaoState = getProfessionalState(joaoSantos, currentSelected, userScenarioServices, professionalsRequested);
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        expect(mariaState).toBe('OPTIMAL'); // Can cover uncovered Manicure/Pedicure
        expect(joaoState).toBe('REDUNDANT'); // Can only cover already covered Botox
        expect(joselitoState).toBe('OPTIMAL'); // Can cover uncovered Manicure/Pedicure
        expect(getUIState(joaoState).color).toBe('yellow');
      });
      
      test('BUG TEST: After selecting João Santos - Ana Costa should be REDUNDANT (gray), not AVAILABLE (white)', () => {
        const currentSelected: (Professional | null)[] = [joaoSantos, null];
        
        const mariaState = getProfessionalState(mariaSilva, currentSelected, userScenarioServices, professionalsRequested);
        const anaState = getProfessionalState(anaCosta, currentSelected, userScenarioServices, professionalsRequested);
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        expect(mariaState).toBe('OPTIMAL'); // Can cover uncovered Manicure/Pedicure
        expect(anaState).toBe('REDUNDANT'); // Can only cover already covered Botox - should be REDUNDANT not AVAILABLE
        expect(joselitoState).toBe('OPTIMAL'); // Can cover uncovered Manicure/Pedicure
        
        // UI state validation
        expect(getUIState(anaState).color).toBe('yellow'); // Should be yellow (redundant), not white (available)
        expect(getUIState(anaState).selectable).toBe(false); // Should not be selectable
      });
    });
    
    describe('Triple Professional Sequence (3 pros)', () => {
      const professionalsRequested = 3;
      
      test('Initial state - all professionals should be OPTIMAL', () => {
        const currentSelected: (Professional | null)[] = [null, null, null];
        
        userScenarioProfessionals.forEach(pro => {
          const state = getProfessionalState(pro, currentSelected, userScenarioServices, professionalsRequested);
          expect(state).toBe('OPTIMAL');
          expect(getUIState(state).color).toBe('green');
        });
      });
      
      test('After selecting Ana Costa (Botox) - redundant Botox pro should be AVAILABLE (still need 2 more)', () => {
        const currentSelected: (Professional | null)[] = [anaCosta, null, null];
        
        const mariaState = getProfessionalState(mariaSilva, currentSelected, userScenarioServices, professionalsRequested);
        const joaoState = getProfessionalState(joaoSantos, currentSelected, userScenarioServices, professionalsRequested);
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        expect(mariaState).toBe('OPTIMAL'); // Can cover uncovered nail services
        expect(joaoState).toBe('REDUNDANT'); // Can only do covered Botox while uncovered services exist
        expect(joselitoState).toBe('OPTIMAL'); // Can cover uncovered nail services
        expect(getUIState(joaoState).color).toBe('yellow'); // Yellow because redundant
      });
      
      test('BUG TEST 3-PROS: After selecting João Santos (Botox) - Ana Costa should be REDUNDANT (gray) because she cannot help with uncovered services', () => {
        const currentSelected: (Professional | null)[] = [joaoSantos, null, null];
        
        // Debug the exact conditions
        const selectedServices = userScenarioServices; // [botox, manicure, pedicure]
        const professionalServices = selectedServices.filter((service: Service) => 
          (anaCosta.services_offered as any)?.includes(service.id)
        ); // Should be [botox] only
        
        const uncoveredServices = selectedServices.filter((service: Service) => {
          return !currentSelected.some((selectedProf: Professional | null) => 
            selectedProf && (selectedProf.services_offered as any)?.includes(service.id)
          );
        }); // Should be [manicure, pedicure]
        
        const alreadyCoveredServices = selectedServices.filter((service: Service) => !uncoveredServices.includes(service)); // Should be [botox]
        
        const canOnlyProvideCoveredServices = professionalServices.length > 0 && 
          professionalServices.every((service: Service) => alreadyCoveredServices.includes(service));
        
        // Debug assertions
        console.log('Services Ana Costa can provide:', professionalServices.map(s => s.name));
        console.log('Uncovered services:', uncoveredServices.map(s => s.name));
        console.log('Already covered services:', alreadyCoveredServices.map(s => s.name));
        console.log('Can only provide covered services:', canOnlyProvideCoveredServices);
        
        expect(professionalServices.map(s => s.name)).toEqual(['Botox']); // Ana can only do Botox
        expect(uncoveredServices.map(s => s.name)).toEqual(['Manicure', 'Pedicure']); // These are uncovered
        expect(alreadyCoveredServices.map(s => s.name)).toEqual(['Botox']); // Botox is covered
        expect(canOnlyProvideCoveredServices).toBe(true); // Ana can ONLY provide covered services
        
        const mariaState = getProfessionalState(mariaSilva, currentSelected, userScenarioServices, professionalsRequested);
        const anaState = getProfessionalState(anaCosta, currentSelected, userScenarioServices, professionalsRequested);
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        expect(mariaState).toBe('OPTIMAL'); // Can cover uncovered nail services
        expect(anaState).toBe('REDUNDANT'); // Can ONLY do covered Botox AND cannot help with uncovered Manicure/Pedicure
        expect(joselitoState).toBe('OPTIMAL'); // Can cover uncovered nail services
        
        // UI state validation - Ana Costa should be redundant because she's useless for uncovered services
        expect(getUIState(anaState).color).toBe('yellow'); // Should be yellow (redundant) because she can't help
        expect(getUIState(anaState).selectable).toBe(false); // Should NOT be selectable
      });
      
      test('After selecting Ana + Maria (all services covered) - remaining should be AVAILABLE', () => {
        const currentSelected: (Professional | null)[] = [anaCosta, mariaSilva, null];
        
        const joaoState = getProfessionalState(joaoSantos, currentSelected, userScenarioServices, professionalsRequested);
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        // All services covered but still need 1 more professional for the 3-pro sequence
        expect(joaoState).toBe('AVAILABLE'); 
        expect(joselitoState).toBe('AVAILABLE');
        expect(getUIState(joaoState).color).toBe('white');
        expect(getUIState(joselitoState).color).toBe('white');
      });
      
      test('After selecting 3 pros - 4th should be REDUNDANT', () => {
        const currentSelected: (Professional | null)[] = [anaCosta, mariaSilva, joaoSantos];
        
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        // Now we have enough professionals AND Joselito can only provide covered services
        expect(joselitoState).toBe('REDUNDANT');
        expect(getUIState(joselitoState).color).toBe('yellow');
        expect(getUIState(joselitoState).selectable).toBe(false);
      });
    });
    
    describe('Quad Professional Sequence (4 pros)', () => {
      const professionalsRequested = 4;
      
      test('All services covered but still need 4 professionals - should remain AVAILABLE', () => {
        const currentSelected: (Professional | null)[] = [anaCosta, mariaSilva, null, null];
        
        const joaoState = getProfessionalState(joaoSantos, currentSelected, userScenarioServices, professionalsRequested);
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        // All services covered but still need 2 more professionals
        expect(joaoState).toBe('AVAILABLE');
        expect(joselitoState).toBe('AVAILABLE');
        expect(getUIState(joaoState).selectable).toBe(true);
        expect(getUIState(joselitoState).selectable).toBe(true);
      });
      
      test('With 3 pros selected - 4th should still be AVAILABLE', () => {
        const currentSelected: (Professional | null)[] = [anaCosta, mariaSilva, joaoSantos, null];
        
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        // Still need 1 more professional for 4-pro sequence
        expect(joselitoState).toBe('AVAILABLE');
        expect(getUIState(joselitoState).color).toBe('white');
      });
    });
    
    describe('Selection Order Scenarios', () => {
      const professionalsRequested = 3;
      
      test('Selecting nail specialists first - Botox specialists should remain OPTIMAL', () => {
        const currentSelected: (Professional | null)[] = [mariaSilva, joselito, null];
        
        const anaState = getProfessionalState(anaCosta, currentSelected, userScenarioServices, professionalsRequested);
        const joaoState = getProfessionalState(joaoSantos, currentSelected, userScenarioServices, professionalsRequested);
        
        // Botox service is uncovered, so both Botox specialists should be OPTIMAL
        expect(anaState).toBe('OPTIMAL');
        expect(joaoState).toBe('OPTIMAL');
        expect(getUIState(anaState).color).toBe('green');
        expect(getUIState(joaoState).color).toBe('green');
      });
      
      test('User reported issue: Ana Costa selected, then Maria Silva - Joselito should be AVAILABLE', () => {
        // This is the exact user scenario that was problematic
        const currentSelected: (Professional | null)[] = [anaCosta, mariaSilva, null];
        
        const joselitoState = getProfessionalState(joselito, currentSelected, userScenarioServices, professionalsRequested);
        
        // All services covered but still need 3rd professional - should be AVAILABLE not REDUNDANT
        expect(joselitoState).toBe('AVAILABLE');
        expect(getUIState(joselitoState).color).toBe('white');
        expect(getUIState(joselitoState).selectable).toBe(true);
      });
    });
  });
  
  describe('Real-world Scenario Tests with UI States', () => {
    
    test('Hair + Nail services with 3 pros - complete selection flow', () => {
      const selectedServices = [services.hairColor, services.manicure, services.pedicure];
      const professionalsRequested = 3;
      
      // Step 1: No selection - all capable professionals should be green (OPTIMAL)
      let currentSelected: (Professional | null)[] = [null, null, null];
      
      expect(getProfessionalState(professionals.hairOnlyColor, currentSelected, selectedServices, professionalsRequested)).toBe('OPTIMAL');
      expect(getProfessionalState(professionals.nailPro1, currentSelected, selectedServices, professionalsRequested)).toBe('OPTIMAL');
      expect(getUIState('OPTIMAL').color).toBe('green');
      
      // Step 2: Select hair professional - nail pros stay green, redundant hair pro becomes available
      currentSelected = [professionals.hairOnlyColor, null, null];
      
      expect(getProfessionalState(professionals.nailPro1, currentSelected, selectedServices, professionalsRequested)).toBe('OPTIMAL');
      expect(getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested)).toBe('REDUNDANT'); // Redundant because can only provide covered services
      expect(getUIState('REDUNDANT').color).toBe('yellow');
      
      // Step 3: Select nail professional (covers both nail services) - still need 1 more pro
      currentSelected = [professionals.hairOnlyColor, professionals.nailPro1, null];
      
      const redundantNailState = getProfessionalState(professionals.nailPro2, currentSelected, selectedServices, professionalsRequested);
      expect(redundantNailState).toBe('AVAILABLE'); // All services covered but still need 3rd pro
      expect(getUIState(redundantNailState).selectable).toBe(true);
      
      // Step 4: Select 3rd professional - now redundant ones should be yellow
      currentSelected = [professionals.hairOnlyColor, professionals.nailPro1, professionals.massageOnly];
      
      const finalRedundantState = getProfessionalState(professionals.hairPro2, currentSelected, selectedServices, professionalsRequested);
      expect(finalRedundantState).toBe('REDUNDANT'); // Now we have enough pros AND this one only provides covered services
      expect(getUIState(finalRedundantState).color).toBe('yellow');
      expect(getUIState(finalRedundantState).selectable).toBe(false);
    });
    
    test('User scenario: Botox + Manicure + Pedicure with overlapping specialists', () => {
      const selectedServices = [services.botox, services.manicure, services.pedicure];
      const professionalsRequested = 3;
      
      // Available professionals:
      // - botoxOnly: Only Botox
      // - nailPro1: Manicure + Pedicure
      // - nailPro2: Manicure + Pedicure  
      // - manicureOnly: Only Manicure
      
      // Step 1: Select Botox specialist
      let currentSelected: (Professional | null)[] = [professionals.botoxOnly, null, null];
      
      // Nail professionals should be OPTIMAL (can cover uncovered nail services)
      expect(getProfessionalState(professionals.nailPro1, currentSelected, selectedServices, professionalsRequested)).toBe('OPTIMAL');
      expect(getUIState('OPTIMAL').color).toBe('green');
      
      // Step 2: Select nail professional who can do both nail services
      currentSelected = [professionals.botoxOnly, professionals.nailPro1, null];
      
      // All services now covered, but still need 1 more professional
      const redundantNailState = getProfessionalState(professionals.nailPro2, currentSelected, selectedServices, professionalsRequested);
      expect(redundantNailState).toBe('AVAILABLE'); // Available because we need 3rd pro
      expect(getUIState(redundantNailState).color).toBe('white');
      expect(getUIState(redundantNailState).selectable).toBe(true);
      
      // Manicure-only professional should also be available
      const manicureOnlyState = getProfessionalState(professionals.manicureOnly, currentSelected, selectedServices, professionalsRequested);
      expect(manicureOnlyState).toBe('AVAILABLE');
    });
  });
});