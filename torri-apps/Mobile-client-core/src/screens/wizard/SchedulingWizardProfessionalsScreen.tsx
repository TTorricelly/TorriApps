import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Image, Modal, Animated, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WizardHeader, WizardContainer } from '../../components/wizard';
import { useWizardStore } from '../../store/wizardStore';
import { wizardApiService } from '../../services/wizardApiService';
import { WizardNavigationProp } from '../../navigation/SchedulingWizardNavigator';
import { Service, Professional } from '../../types';
import { buildAssetUrl } from '../../utils/urlHelpers';

type SchedulingWizardProfessionalsScreenNavigationProp = WizardNavigationProp<'WizardProfessionals'>;

const SchedulingWizardProfessionalsScreen: React.FC = () => {
  const navigation = useNavigation<SchedulingWizardProfessionalsScreenNavigationProp>();
  const [imageErrors, setImageErrors] = React.useState<{[key: string]: boolean}>({});
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);
  const [showProfessionalCountModal, setShowProfessionalCountModal] = React.useState(false);
  
  // Animation for ready button
  const buttonShakeAnim = React.useRef(new Animated.Value(0)).current;
  
  const {
    selectedServices,
    selectedDate,
    professionalsRequested,
    maxParallelPros,
    defaultProsRequested,
    selectedProfessionals,
    availableProfessionals,
    isLoading,
    error,
    setProfessionalsRequested,
    setMaxParallelPros,
    setDefaultProsRequested,
    setSelectedProfessionals,
    setAvailableProfessionals,
    setLoading,
    setError,
    clearError,
    setCurrentStep,
    goToNextStep,
    goToPreviousStep,
    canProceedToStep,
    resetFromStep,
  } = useWizardStore();

  useEffect(() => {
    setCurrentStep(2);
    // Load professionals first, then let the optimal calculation determine the count
    loadAvailableProfessionals();
  }, [selectedDate]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (isValidSelection()) {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowSuccessMessage(false);
    }
  }, [selectedProfessionals, professionalsRequested]);


  const loadConfiguration = async () => {
    try {
      // Load default professionals suggested setting
      const defaultPros = await wizardApiService.getDefaultProsRequested();
      setDefaultProsRequested(defaultPros);
      
      // Calculate maximum professionals based on services
      const maxPros = Math.min(
        ...selectedServices.map((service: Service) => service.max_parallel_pros || 1)
      );
      setMaxParallelPros(maxPros);
      
      // Set initial professionals requested
      // If only 1 service selected, use 1 professional
      // For multiple services, start with default but allow user to choose
      let initialPros;
      if (selectedServices.length === 1) {
        initialPros = 1;
      } else {
        // For multiple services, start with default professionals suggested
        // User can always change via sequence selection card
        initialPros = Math.min(defaultPros, maxPros || 2);
      }
      setProfessionalsRequested(initialPros);
      
    } catch (error) {
      console.error('Error loading configuration:', error);
      // Use fallback values
      setMaxParallelPros(1);
      setDefaultProsRequested(1);
      setProfessionalsRequested(1);
    }
  };

  const loadAvailableProfessionals = async () => {
    if (!selectedDate || selectedServices.length === 0) return;

    setLoading(true);
    clearError();

    try {
      const serviceIds = selectedServices.map((service: Service) => service.id);
      const professionals = await wizardApiService.getAvailableProfessionals(
        serviceIds,
        selectedDate
      );
      
      
      setAvailableProfessionals(professionals);
      
      // Calculate optimal professionals needed FIRST, before any other logic
      const optimalProfessionalsNeeded = calculateOptimalProfessionalsNeeded(selectedServices, professionals);
      
      // Set optimal count immediately to prevent race conditions
      setProfessionalsRequested(optimalProfessionalsNeeded);
      
      // Auto-select professionals based on service exclusivity
      if (professionals.length === 1) {
        // Only 1 professional total - auto-select
        setSelectedProfessionals([professionals[0]]);
        setProfessionalsRequested(1);
      } else {
        // Auto-select professionals who are the only ones that can provide specific services
        const autoSelectedProfessionals: Professional[] = [];
        
        selectedServices.forEach((service: Service) => {
          const capableProfessionals = professionals.filter((prof: Professional) => 
            prof.services_offered?.includes(service.id)
          );
          
          // If only 1 professional can provide this service, auto-select them
          if (capableProfessionals.length === 1) {
            const exclusiveProfessional = capableProfessionals[0];
            if (!autoSelectedProfessionals.some(p => p.id === exclusiveProfessional.id)) {
              autoSelectedProfessionals.push(exclusiveProfessional);
            }
          }
        });
        
        
        if (autoSelectedProfessionals.length > 0) {
          // Always set to optimal count for consistency across dates
          const requiredCount = Math.max(autoSelectedProfessionals.length, optimalProfessionalsNeeded);
          setProfessionalsRequested(requiredCount);
          
          // Fill remaining slots with null to maintain array structure
          const selectedArray = [...autoSelectedProfessionals];
          while (selectedArray.length < requiredCount) {
            selectedArray.push(null);
          }
          setSelectedProfessionals(selectedArray);
        } else {
          // No auto-selected professionals, but still update to optimal count
          // Always set to optimal to ensure consistency across dates
          setProfessionalsRequested(optimalProfessionalsNeeded);
          // Reset selected professionals when available professionals change
          setSelectedProfessionals([]);
        }
      }
      
    } catch (error) {
      console.error('Error loading available professionals:', error);
      setError('Erro ao carregar profissionais disponíveis. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalsCountChange = (count: number) => {
    setProfessionalsRequested(count);
    resetFromStep(3); // Reset time slots when changing professional count
    // Auto-close modal after selection
    setTimeout(() => {
      setShowProfessionalCountModal(false);
    }, 300);
  };

  const handleProfessionalSelect = (professional: Professional) => {
    const isSelected = selectedProfessionals.some((prof: Professional | null) => prof?.id === professional.id);
    
    if (isSelected) {
      // Remove professional
      const newSelected = selectedProfessionals.filter((prof: Professional | null) => prof?.id !== professional.id);
      // Fill remaining slots with null to maintain count
      while (newSelected.length < professionalsRequested) {
        newSelected.push(null);
      }
      setSelectedProfessionals(newSelected);
    } else {
      // Smart selection logic to prevent redundant coverage
      const newSelected = [...selectedProfessionals];
      
      // Check if selecting this professional would create redundant coverage
      const wouldCreateRedundancy = checkIfSelectionCreatesRedundancy(professional, newSelected);
      
      if (wouldCreateRedundancy) {
        // Show helpful guidance instead of allowing redundant selection
        showRedundancyGuidance(professional);
        return;
      }
      
      const firstEmptyIndex = newSelected.findIndex((prof: Professional | null) => prof === null);
      
      if (firstEmptyIndex !== -1) {
        newSelected[firstEmptyIndex] = professional;
        setSelectedProfessionals(newSelected);
      } else if (newSelected.length < professionalsRequested) {
        newSelected.push(professional);
        setSelectedProfessionals(newSelected);
      }
    }
    
    resetFromStep(3); // Reset time slots when changing professionals
  };

  const handleContinue = () => {
    if (canProceedToStep(3)) {
      goToNextStep();
      navigation.navigate('WizardSlots');
    }
  };

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  const handleEditServices = () => {
    // Exit wizard modal and return to ServicesScreen where users can edit services
    navigation.getParent()?.goBack(); // Exit the wizard modal
  };


  const getSelectedCount = () => {
    return selectedProfessionals.filter((prof: Professional | null) => prof !== null).length;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}min`;
    }
  };

  const getTotalEstimatedTime = () => {
    return selectedServices.reduce((total: number, service: Service) => {
      return total + service.duration_minutes;
    }, 0);
  };

  const getServiceCoverageStatus = (service: Service): 'covered' | 'partial' | 'uncovered' => {
    const canBeHandled = selectedProfessionals.some((prof: Professional | null) => 
      prof && prof.services_offered?.includes(service.id)
    );
    
    const hasCompleteSelection = getSelectedCount() === professionalsRequested;
    
    if (!canBeHandled) return 'uncovered';
    if (hasCompleteSelection) return 'covered';
    return 'partial'; // Can be handled but selection not complete
  };

  const renderServiceChip = ({ item: service }: { item: Service }) => {
    const status = getServiceCoverageStatus(service);
    
    return (
      <View style={[
        styles.serviceChip,
        status === 'covered' && styles.serviceChipCovered,
        status === 'partial' && styles.serviceChipPartial
      ]}>
        <View style={styles.serviceChipContent}>
          <Text style={[
            styles.serviceChipText,
            status === 'covered' && styles.serviceChipTextCovered,
            status === 'partial' && styles.serviceChipTextPartial
          ]}>
            {service.name}
          </Text>
          <Text style={[
            styles.serviceChipDuration,
            status === 'covered' && styles.serviceChipDurationCovered,
            status === 'partial' && styles.serviceChipDurationPartial
          ]}>
            {service.duration_minutes}min
          </Text>
        </View>
        {status === 'covered' && (
          <View style={styles.serviceCheckMark}>
            <Text style={styles.serviceCheckMarkText}>✓</Text>
          </View>
        )}
        {status === 'partial' && (
          <View style={styles.servicePartialMark}>
            <Text style={styles.servicePartialMarkText}>⏳</Text>
          </View>
        )}
      </View>
    );
  };

  const handleImageError = (professionalId: string) => {
    setImageErrors(prev => ({ ...prev, [professionalId]: true }));
  };

  const handleImageLoad = (professionalId: string) => {
    setImageErrors(prev => ({ ...prev, [professionalId]: false }));
  };

  const getMatchingServices = (professional: Professional): string[] => {
    if (!professional.services_offered || !selectedServices) return [];
    
    // Find which selected services this professional can provide
    const matchingServices = selectedServices.filter((selectedService: Service) => 
      professional.services_offered?.includes(selectedService.id)
    );
    
    return matchingServices.map((service: Service) => service.name);
  };

  const calculateOptimalProfessionalsNeeded = (services: Service[], professionals: Professional[]): number => {
    if (services.length === 0 || professionals.length === 0) return 1;
    if (services.length === 1) return 1; // Single service always needs 1 professional
    
    // Check if any single professional can handle ALL services
    const professionalsWhoCanHandleAll = professionals.filter((prof: Professional) => {
      return services.every((service: Service) => 
        prof.services_offered?.includes(service.id)
      );
    });
    
    // If at least one professional can handle all services, we only need 1
    if (professionalsWhoCanHandleAll.length > 0) {
      return 1;
    }
    
    // Enhanced analysis: consider optimal vs minimum scenarios
    const serviceToProfs = new Map<string, Set<string>>();
    services.forEach((service: Service) => {
      const capableProfIds = new Set<string>();
      professionals.forEach((prof: Professional) => {
        if (prof.services_offered?.includes(service.id)) {
          capableProfIds.add(prof.id);
        }
      });
      serviceToProfs.set(service.id, capableProfIds);
    });
    
    // Check zero overlap (minimum requirement)
    const serviceIds = Array.from(serviceToProfs.keys());
    let foundZeroOverlap = false;
    
    for (let i = 0; i < serviceIds.length; i++) {
      for (let j = i + 1; j < serviceIds.length; j++) {
        const profsForServiceA = serviceToProfs.get(serviceIds[i]) || new Set();
        const profsForServiceB = serviceToProfs.get(serviceIds[j]) || new Set();
        const intersection = new Set([...profsForServiceA].filter(x => profsForServiceB.has(x)));
        
        if (intersection.size === 0) {
          foundZeroOverlap = true;
        }
      }
    }
    
    // Smart defaults based on service patterns
    if (services.length >= 3) {
      // For 3+ services, consider individual professional assignment as optimal
      // Check if we have enough professionals for 1-per-service approach
      const maxProfessionalsNeeded = Math.min(services.length, professionals.length);
      
      // If each service can be handled by multiple professionals, suggest individual assignment
      const allServicesHaveOptions = Array.from(serviceToProfs.values()).every(profSet => profSet.size >= 1);
      if (allServicesHaveOptions && maxProfessionalsNeeded >= 3) {
        return maxProfessionalsNeeded; // Suggest 1 professional per service
      }
    }
    
    // Fallback to minimum required
    if (foundZeroOverlap) {
      return Math.min(2, professionals.length);
    }
    
    return Math.min(2, professionals.length);
  };

  const getExclusiveServices = (professional: Professional): string[] => {
    if (!professional.services_offered || !selectedServices) return [];
    
    // Find services that only this professional can provide
    const exclusiveServices = selectedServices.filter((selectedService: Service) => {
      if (!professional.services_offered?.includes(selectedService.id)) return false;
      
      // Count how many professionals can provide this service
      const providersCount = availableProfessionals.filter((prof: Professional) => 
        prof.services_offered?.includes(selectedService.id)
      ).length;
      
      return providersCount === 1;
    });
    
    return exclusiveServices.map((service: Service) => service.name);
  };

  const getFormattedServices = (professional: Professional): string => {
    const allServices = getMatchingServices(professional);
    const exclusiveServices = getExclusiveServices(professional);
    
    if (allServices.length === 0) return 'Nenhum serviço selecionado';
    
    // Format services with star indicator for exclusive ones
    const formattedServices = allServices.map((serviceName: string) => {
      const isExclusive = exclusiveServices.includes(serviceName);
      return isExclusive ? `⭐ ${serviceName}` : serviceName;
    });
    
    return formattedServices.join(' • ');
  };

  const hasExclusiveServices = (): boolean => {
    return availableProfessionals.some((professional: Professional) => 
      getExclusiveServices(professional).length > 0
    );
  };

  const getUncoveredServices = (): string[] => {
    return selectedServices
      .filter((service: Service) => getServiceCoverageStatus(service) === 'uncovered')
      .map((service: Service) => service.name);
  };

  const hasCompleteServiceCoverage = (): boolean => {
    return selectedServices.every((service: Service) => getServiceCoverageStatus(service) === 'covered');
  };

  const isValidSelection = (): boolean => {
    const hasServiceCoverage = hasCompleteServiceCoverage();
    const hasRequiredProfessionals = getSelectedCount() === professionalsRequested;
    return hasServiceCoverage && hasRequiredProfessionals;
  };

  // ==========================================
  // ALGORITHMIC PROFESSIONAL SELECTION LOGIC
  // ==========================================
  
  // Professional state types
  type ProfessionalState = 'SELECTED' | 'OPTIMAL' | 'AVAILABLE' | 'REDUNDANT' | 'DISABLED';
  
  // Note: services_offered is typed as Service[] but actually contains string IDs (API inconsistency)
  
  // Core algorithm to determine professional state
  const getProfessionalState = (
    professional: Professional,
    currentSelected: (Professional | null)[]
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
      ? getStateForMultiProfessionalSequence(professional, currentSelected, professionalServices)
      : getStateForSingleOrDualSequence(professional, currentSelected, professionalServices);
    
    
    return state;
  };
  
  // Algorithm for sequence = 3+ (Assignment Problem approach)
  const getStateForMultiProfessionalSequence = (
    professional: Professional,
    currentSelected: (Professional | null)[],
    _professionalServices: Service[]
  ): ProfessionalState => {
    const selectedCount = currentSelected.filter(prof => prof !== null).length;
    const servicesCount = selectedServices.length;
    
    // Check if any services are already covered (this determines if we're in Phase 2)
    const coveredServices = selectedServices.filter((service: Service) => 
      currentSelected.some((selectedProf: Professional | null) => 
        selectedProf && (selectedProf.services_offered as any)?.includes(service.id)
      )
    );
    const hasAnyCoverage = coveredServices.length > 0;
    
    // Phase 1: Until we have any coverage, highlight all who can help
    if (selectedCount === 0 || !hasAnyCoverage) {
      // In sequence=3, initially highlight anyone who can provide any service
      const canProvideAnyService = selectedServices.some((service: Service) => 
        (professional.services_offered as any)?.includes(service.id)
      );
      return canProvideAnyService ? 'OPTIMAL' : 'AVAILABLE';
    }
    
    // Phase 2: We have some coverage, now check for redundancy  
    const uncoveredServices = getUncoveredServicesForAssignment(currentSelected);
    const alreadyCoveredServices = selectedServices.filter((service: Service) => !uncoveredServices.includes(service));
    
    // Get services this professional can provide
    const professionalServices = selectedServices.filter((service: Service) => 
      (professional.services_offered as any)?.includes(service.id)
    );
    
    // Check if professional can ONLY provide already-covered services
    const canOnlyProvideCoveredServices = professionalServices.length > 0 && 
      professionalServices.every((service: Service) => alreadyCoveredServices.includes(service));
    
    // In 3+ professional sequences, only mark as redundant if we already have enough professionals
    // AND they can only provide covered services
    const hasEnoughProfessionals = selectedCount >= professionalsRequested;
    
    if (canOnlyProvideCoveredServices && hasEnoughProfessionals) {
      // Professional can only do services that are already covered AND we have enough professionals = REDUNDANT
      return 'REDUNDANT';
    }
    
    if (uncoveredServices.length === 0) {
      // All services covered, but check if we still need more professionals for the sequence
      if (selectedCount < professionalsRequested) {
        // Still need more professionals, so this one is available
        return 'AVAILABLE';
      } else {
        // Have enough professionals and all services covered
        return 'AVAILABLE';
      }
    }
    
    // Check if this professional can help with uncovered services
    const canHelpWithUncovered = uncoveredServices.some((service: Service) => 
      (professional.services_offered as any)?.includes(service.id)
    );
    
    return canHelpWithUncovered ? 'OPTIMAL' : 'AVAILABLE';
  };
  
  // Algorithm for sequence = 1-2 (Set Cover approach)
  const getStateForSingleOrDualSequence = (
    professional: Professional,
    currentSelected: (Professional | null)[],
    _professionalServices: Service[]
  ): ProfessionalState => {
    const uncoveredServices = selectedServices.filter((service: Service) => {
      return !currentSelected.some((selectedProf: Professional | null) => 
        selectedProf && (selectedProf.services_offered as any)?.includes(service.id)
      );
    });
    
    if (uncoveredServices.length === 0) {
      // All services covered
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
      
      // Higher coverage score = more optimal
      return coverageScore > 0 ? 'OPTIMAL' : 'AVAILABLE';
    }
    
    // Can only provide already covered services
    return 'REDUNDANT';
  };
  
  // Get optimal professional choices using assignment problem logic
  const getOptimalChoicesForAssignment = (currentSelected: (Professional | null)[]): string[] => {
    const uncoveredServices = getUncoveredServicesForAssignment(currentSelected);
    
    if (uncoveredServices.length === 0) return [];
    
    // Greedy algorithm: find professionals that cover most uncovered services
    const professionalScores = availableProfessionals.map((professional: Professional) => {
      const coverageCount = uncoveredServices.filter((service: Service) => 
        (professional.services_offered as any)?.includes(service.id)
      ).length;
      
      return {
        professionalId: professional.id,
        score: coverageCount
      };
    });
    
    // Return professionals with highest coverage scores
    const maxScore = Math.max(...professionalScores.map((p: any) => p.score));
    return professionalScores
      .filter((p: any) => p.score === maxScore && p.score > 0)
      .map((p: any) => p.professionalId);
  };
  
  // Get uncovered services for assignment algorithm
  const getUncoveredServicesForAssignment = (currentSelected: (Professional | null)[]): Service[] => {
    return selectedServices.filter((service: Service) => {
      return !currentSelected.some((selectedProf: Professional | null) => 
        selectedProf && (selectedProf.services_offered as any)?.includes(service.id)
      );
    });
  };
  
  // Legacy compatibility functions (now using algorithmic approach)
  const checkIfSelectionCreatesRedundancy = (
    professional: Professional, 
    currentSelected: (Professional | null)[]
  ): boolean => {
    const state = getProfessionalState(professional, currentSelected);
    return state === 'REDUNDANT';
  };

  const isOptimalSelection = (
    professional: Professional, 
    currentSelected: (Professional | null)[]
  ): boolean => {
    const state = getProfessionalState(professional, currentSelected);
    return state === 'OPTIMAL';
  };

  const getBetterAlternatives = (
    professional: Professional, 
    currentSelected: (Professional | null)[]
  ): Professional[] => {
    // Find professionals who can cover currently uncovered services
    const uncoveredServices = selectedServices.filter((service: Service) => {
      const isCovered = currentSelected.some((selectedProf: Professional | null) => 
        selectedProf && (selectedProf.services_offered as any)?.includes(service.id)
      );
      return !isCovered;
    });
    
    if (uncoveredServices.length === 0) return [];
    
    // Find professionals who can cover these uncovered services
    const alternatives = availableProfessionals.filter((prof: Professional) => {
      if (prof.id === professional.id) return false; // Exclude the professional being selected
      if (currentSelected.some(selected => selected?.id === prof.id)) return false; // Exclude already selected
      
      return uncoveredServices.some((service: Service) => 
        (prof.services_offered as any)?.includes(service.id)
      );
    });
    
    return alternatives;
  };

  const showRedundancyGuidance = (professional: Professional) => {
    const alternatives = getBetterAlternatives(professional, selectedProfessionals);
    const uncoveredServices = getUncoveredServices();
    
    let message = `${professional.full_name || professional.email} já tem seus serviços cobertos por outros profissionais selecionados.`;
    
    if (uncoveredServices.length > 0) {
      message += `\n\nServiços ainda não cobertos: ${uncoveredServices.join(', ')}`;
      
      if (alternatives.length > 0) {
        const alternativeNames = alternatives.slice(0, 2).map(alt => alt.full_name || alt.email).join(' ou ');
        message += `\n\nSugestão: Selecione ${alternativeNames} para cobrir estes serviços.`;
      }
    }
    
    // Adjust message for 3+ sequences
    if (professionalsRequested >= 3 && uncoveredServices.length > 0) {
      message = `Para maior eficiência, considere selecionar profissionais que cubram serviços diferentes.\n\nServiços ainda não cobertos: ${uncoveredServices.join(', ')}`;
      
      if (alternatives.length > 0) {
        const alternativeNames = alternatives.slice(0, 2).map(alt => alt.full_name || alt.email).join(' ou ');
        message += `\n\nSugestão: ${alternativeNames} podem cobrir estes serviços.`;
      }
    }
    
    // Show guidance to user about better selection
    Alert.alert(
      'Seleção Inteligente',
      message,
      [{ text: 'Entendi' }]
    );
  };

  // Happy button shake animation when ready
  React.useEffect(() => {
    if (isValidSelection() && !showSuccessMessage) {
      // Delay the shake slightly after success message disappears
      const shakeTimer = setTimeout(() => {
        // Create a gentle shake animation (left-right movement)
        const shakeAnimation = Animated.sequence([
          Animated.timing(buttonShakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(buttonShakeAnim, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(buttonShakeAnim, {
            toValue: 8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(buttonShakeAnim, {
            toValue: -8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(buttonShakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]);
        
        shakeAnimation.start();
      }, 300); // Small delay after success message disappears
      
      return () => {
        clearTimeout(shakeTimer);
        buttonShakeAnim.setValue(0);
      };
    } else {
      // Reset animation when not ready
      buttonShakeAnim.setValue(0);
    }
  }, [selectedProfessionals, professionalsRequested, showSuccessMessage]);

  const getEstimatedTimeText = (): string => {
    const totalMinutes = getTotalEstimatedTime();
    return formatDuration(totalMinutes);
  };


  const handleOpenProfessionalCountModal = () => {
    setShowProfessionalCountModal(true);
  };

  const handleCloseProfessionalCountModal = () => {
    setShowProfessionalCountModal(false);
  };

  const renderProfessionalChip = ({ item: professional }: { item: Professional }) => {
    const isSelected = selectedProfessionals.some((prof: Professional | null) => prof?.id === professional.id);
    
    // More intelligent selection logic that considers actual service requirements
    // Calculate what we actually need in real-time, not just what professionalsRequested says
    const actualOptimalNeeded = calculateOptimalProfessionalsNeeded(selectedServices, availableProfessionals);
    const effectiveLimit = Math.max(professionalsRequested, actualOptimalNeeded);
    
    const canSelect = !isSelected && getSelectedCount() < effectiveLimit;
    
    
    const isOnlyOption = availableProfessionals.length === 1;
    const isDisabled = !isSelected && !canSelect;
    
    const imageError = imageErrors[professional.id] || false;
    
    // Process photo URL using best practices - API returns photo_path, not photo_url
    const photoPath = professional.photo_path; // API returns photo_path field
    const fullPhotoUrl = photoPath ? buildAssetUrl(photoPath) : null;
    const hasValidPhoto = fullPhotoUrl && !imageError;
    
    
    return (
      <TouchableOpacity
        style={[
          styles.professionalChip,
          isSelected && styles.professionalChipSelected,
          isDisabled && styles.professionalChipDisabled,
        ]}
        onPress={() => !isOnlyOption && handleProfessionalSelect(professional)}
        disabled={isDisabled || isOnlyOption}
        activeOpacity={isOnlyOption ? 1 : 0.7}
      >
        <View style={[
          styles.professionalAvatar,
          isSelected && styles.professionalAvatarSelected,
        ]}>
          {hasValidPhoto ? (
            <Image
              source={{ uri: fullPhotoUrl }}
              style={styles.professionalAvatarImage}
              resizeMode="cover"
              onError={() => handleImageError(professional.id)}
              onLoad={() => handleImageLoad(professional.id)}
            />
          ) : (
            <Text style={[
              styles.professionalAvatarText,
              isSelected && styles.professionalAvatarTextSelected,
            ]}>
              {(professional.full_name || professional.email || 'U').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.professionalChipInfo}>
          <Text style={[
            styles.professionalChipName,
            isSelected && styles.professionalChipNameSelected,
            isDisabled && styles.professionalChipNameDisabled,
          ]}>
            {professional.full_name || professional.email}
          </Text>
          <Text style={[
            styles.professionalChipServices,
            isSelected && styles.professionalChipServicesSelected,
            isDisabled && styles.professionalChipServicesDisabled,
          ]}>
            {getFormattedServices(professional)}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedIndicatorText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderProfessionalCard = ({ item: professional }: { item: Professional }) => {
    const isSelected = selectedProfessionals.some((prof: Professional | null) => prof?.id === professional.id);
    
    // More intelligent selection logic that considers actual service requirements
    const actualOptimalNeeded = calculateOptimalProfessionalsNeeded(selectedServices, availableProfessionals);
    const effectiveLimit = Math.max(professionalsRequested, actualOptimalNeeded);
    const canSelect = !isSelected && getSelectedCount() < effectiveLimit;
    
    const isOnlyOption = availableProfessionals.length === 1;
    
    // Use algorithmic approach for professional state
    const professionalState = !isSelected ? getProfessionalState(professional, selectedProfessionals) : 'SELECTED';
    const shouldShowWarning = professionalState === 'REDUNDANT';
    const shouldHighlight = professionalState === 'OPTIMAL';
    
    const isDisabled = !isSelected && (!canSelect || shouldShowWarning);
    
    const imageError = imageErrors[professional.id] || false;
    const photoPath = professional.photo_path;
    const fullPhotoUrl = photoPath ? buildAssetUrl(photoPath) : null;
    const hasValidPhoto = fullPhotoUrl && !imageError;
    
    return (
      <View style={styles.professionalCard}>
        <TouchableOpacity
          style={[
            styles.professionalCardContent,
            isSelected && styles.professionalCardSelected,
            isDisabled && styles.professionalCardDisabled,
            shouldHighlight && styles.professionalCardOptimal,
            shouldShowWarning && styles.professionalCardWarning,
          ]}
          onPress={() => !isOnlyOption && handleProfessionalSelect(professional)}
          disabled={isDisabled || isOnlyOption}
          activeOpacity={isOnlyOption ? 1 : 0.8}
        >
          {/* Optimal Selection Indicator */}
          {shouldHighlight && (
            <View style={styles.optimalIndicator}>
              <Text style={styles.optimalIndicatorText}>⭐</Text>
            </View>
          )}
          
          {/* Warning Indicator */}
          {shouldShowWarning && (
            <View style={styles.warningIndicator}>
              <Text style={styles.warningIndicatorText}>⚠️</Text>
            </View>
          )}
          {/* Professional Photo */}
          <View style={[
            styles.professionalCardAvatar,
            isSelected && styles.professionalCardAvatarSelected,
          ]}>
            {hasValidPhoto ? (
              <Image
                source={{ uri: fullPhotoUrl }}
                style={styles.professionalCardAvatarImage}
                resizeMode="cover"
                onError={() => handleImageError(professional.id)}
                onLoad={() => handleImageLoad(professional.id)}
              />
            ) : (
              <Text style={[
                styles.professionalCardAvatarText,
                isSelected && styles.professionalCardAvatarTextSelected,
              ]}>
                {(professional.full_name || professional.email || 'U').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>

          {/* Professional Info */}
          <View style={styles.professionalCardInfo}>
            <Text style={[
              styles.professionalCardName,
              isSelected && styles.professionalCardNameSelected,
              isDisabled && styles.professionalCardNameDisabled,
            ]}>
              {professional.full_name || professional.email}
            </Text>
            
            <Text style={[
              styles.professionalCardServices,
              isSelected && styles.professionalCardServicesSelected,
              isDisabled && styles.professionalCardServicesDisabled,
            ]}>
              {getFormattedServices(professional)}
            </Text>
          </View>

          {/* Selection Indicator */}
          {isSelected && (
            <View style={styles.professionalCardSelectedIndicator}>
              <Text style={styles.professionalCardSelectedIndicatorText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const canContinue = canProceedToStep(3);

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#ec4899" />
      <Text style={styles.loadingText}>Carregando profissionais disponíveis...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={loadAvailableProfessionals}
      >
        <Text style={styles.retryButtonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Nenhum profissional disponível</Text>
      <Text style={styles.emptyText}>
        Não há profissionais disponíveis para os serviços selecionados nesta data.
      </Text>
    </View>
  );

  return (
    <WizardContainer>
      <WizardHeader
        currentStep={2}
        totalSteps={4}
        title="Profissionais"
        onBack={handleBack}
      />

      {isLoading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : availableProfessionals.length === 0 ? (
        renderEmptyState()
      ) : (
        <View style={styles.container}>
          {/* Fixed Services Summary - Always Visible */}
          <View style={styles.stickyServicesContainer}>
            <View style={styles.servicesSummary}>
              <View style={styles.servicesRow}>
                <FlatList
                  data={selectedServices}
                  renderItem={renderServiceChip}
                  keyExtractor={(item: Service) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.servicesChipContainer}
                  ItemSeparatorComponent={() => <View style={styles.chipSeparator} />}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                  style={styles.servicesList}
                />
                <TouchableOpacity 
                  style={styles.editIconButton}
                  onPress={handleEditServices}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editIconText}>✏️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>


          {/* Scrollable Content */}
          <KeyboardAvoidingView 
            style={styles.scrollContainer} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
          >
            <ScrollView 
              style={styles.content} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >

            {/* Professional Selection */}
            <View style={styles.professionalsSection}>
              <Text style={styles.professionalsTitle}>
                {availableProfessionals.length === 1 
                  ? 'Profissional disponível'
                  : selectedServices.length === 1
                    ? 'Selecione o profissional'
                    : professionalsRequested === 1 
                      ? 'Selecione o profissional' 
                      : `Selecione ${professionalsRequested} profissionais`
                }
              </Text>
              
              {/* Legend for exclusive services */}
              {hasExclusiveServices() && (
                <View style={styles.legendContainer}>
                  <Text style={styles.legendText}>⭐ Serviço exclusivo deste profissional</Text>
                </View>
              )}
              
              <FlatList
                data={availableProfessionals}
                renderItem={renderProfessionalCard}
                keyExtractor={(item: Professional) => item.id}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.professionalsCarousel}
                ItemSeparatorComponent={() => <View style={styles.carouselSeparator} />}
                scrollEnabled={true}
                pagingEnabled={false}
                decelerationRate="fast"
                snapToInterval={140} // Card width + separator (smaller cards)
                snapToAlignment="start"
                contentInset={{ left: 16, right: 16 }}
                contentInsetAdjustmentBehavior="automatic"
              />
            </View>

            {/* Sequence Selection Card - Show when multiple services AND multiple professionals available */}
            {availableProfessionals.length > 1 && selectedServices.length > 1 && (
              <TouchableOpacity 
                style={styles.sequenceCard}
                onPress={handleOpenProfessionalCountModal}
                activeOpacity={0.7}
              >
                <View style={styles.sequenceHeader}>
                  <Text style={styles.sequenceTitle}>Sequência de atendimento</Text>
                  <View style={styles.changeButton}>
                    <Text style={styles.changeButtonText}>Alterar</Text>
                  </View>
                </View>
                
                <View style={styles.sequenceContent}>
                  <View style={styles.sequenceOption}>
                    <View style={styles.sequenceIcon}>
                      <Text style={styles.sequenceIconText}>
                        {professionalsRequested === 1 ? '1' : '2+'}
                      </Text>
                    </View>
                    <View style={styles.sequenceInfo}>
                      <Text style={styles.sequenceOptionTitle}>
                        {professionalsRequested === 1 
                          ? '1 Profissional' 
                          : `${professionalsRequested} Profissionais`
                        }
                      </Text>
                      <Text style={styles.sequenceOptionDescription}>
                        {professionalsRequested === 1 
                          ? 'Serviços em sequência'
                          : maxParallelPros === 1
                            ? 'Sequencial • especialistas diferentes'
                            : 'Ao mesmo tempo • mais rápido'
                        }
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.timeEstimate}>
                    <Text style={styles.timeLabel}>Tempo estimado</Text>
                    <Text style={styles.timeValue}>{getEstimatedTimeText()}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Continue Button */}
      {!isLoading && !error && availableProfessionals.length > 0 && (
        <View style={styles.footer}>
          <Animated.View
            style={{
              transform: [{ translateX: buttonShakeAnim }],
            }}
          >
            <TouchableOpacity
              style={[
                styles.continueButton,
                !canContinue && styles.disabledButton,
              ]}
              onPress={handleContinue}
              disabled={!canContinue}
            >
              <Text style={[
                styles.continueButtonText,
                !canContinue && styles.disabledButtonText,
              ]}>
                Ver Horários
              </Text>
            </TouchableOpacity>
          </Animated.View>
          
          {/* Friendly Guide Messages */}
          {!isValidSelection() && (
            <View style={[styles.snackbarOverlay, styles.snackbarGuide]}>
              <View style={styles.snackbarIconContainer}>
                <Text style={styles.snackbarIcon}>
                  {getSelectedCount() === 0 ? '👥' : getSelectedCount() < professionalsRequested ? '✨' : '📋'}
                </Text>
              </View>
              <View style={styles.snackbarContent}>
                <Text style={styles.snackbarTitle}>
                  {getSelectedCount() === 0 
                    ? 'Escolha seus profissionais' 
                    : getSelectedCount() < professionalsRequested
                      ? 'Quase lá!'
                      : 'Verificando serviços'
                  }
                </Text>
                <Text style={styles.snackbarMessage}>
                  {getSelectedCount() === 0 
                    ? 'Selecione o(s) profissional(is) para seus serviços'
                    : getSelectedCount() < professionalsRequested
                      ? `Selecione mais ${professionalsRequested - getSelectedCount()} profissional${professionalsRequested - getSelectedCount() > 1 ? 'is' : ''} para continuar`
                      : `Verifique se todos os serviços estão cobertos: ${getUncoveredServices().join(', ')}`
                  }
                </Text>
              </View>
            </View>
          )}
          
          {showSuccessMessage && isValidSelection() && (
            <View style={[styles.snackbarOverlay, styles.snackbarSuccess]}>
              <View style={styles.snackbarIconContainer}>
                <Text style={styles.snackbarIcon}>✓</Text>
              </View>
              <View style={styles.snackbarContent}>
                <Text style={styles.snackbarTitle}>Tudo pronto!</Text>
                <Text style={styles.snackbarMessage}>
                  {professionalsRequested === 1 
                    ? 'Profissional selecionado e serviços cobertos'
                    : `${professionalsRequested} profissionais selecionados e serviços cobertos`
                  }
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Professional Count Bottom Sheet Modal */}
      <Modal
        visible={showProfessionalCountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseProfessionalCountModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sequência de atendimento</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={handleCloseProfessionalCountModal}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.radioOptions}>
                {/* Dynamic professional count options */}
                {[1, 2, 3].filter(count => {
                  // Show option if:
                  // - 1 professional (always available)
                  // - 2 professionals (if multiple services)
                  // - 3 professionals (if 3+ services and enough professionals)
                  if (count === 1) return true;
                  if (count === 2) return selectedServices.length > 1;
                  if (count === 3) return selectedServices.length >= 3 && availableProfessionals.length >= 3;
                  return false;
                }).map(count => {
                  const isSelected = professionalsRequested === count;
                  const getDescription = (professionalCount: number) => {
                    if (professionalCount === 1) return 'Serviços em sequência';
                    if (professionalCount === 2) return maxParallelPros > 1 ? 'Ao mesmo tempo • mais rápido' : 'Especialistas diferentes';
                    if (professionalCount === 3) return '1 profissional por serviço • máxima flexibilidade';
                    return '';
                  };
                  
                  return (
                    <TouchableOpacity 
                      key={count}
                      style={[
                        styles.radioOption,
                        isSelected && styles.radioOptionSelected
                      ]}
                      onPress={() => handleProfessionalsCountChange(count)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.radioButton}>
                        <View style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected
                        ]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <Text style={styles.radioNumber}>{count}</Text>
                      </View>
                      <View style={styles.radioContent}>
                        <Text style={[
                          styles.radioTitle,
                          isSelected && styles.radioTitleSelected
                        ]}>
                          {count === 1 ? '1 Profissional' : `${count} Profissionais`}
                        </Text>
                        <Text style={[
                          styles.radioDescription,
                          isSelected && styles.radioDescriptionSelected
                        ]}>
                          {getDescription(count)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </WizardContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyServicesContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  stickyBannerContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  servicesSummary: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servicesList: {
    flex: 1,
  },
  servicesSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  servicesSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  summaryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ec4899',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ec4899',
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ec4899',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  editIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  editIconText: {
    fontSize: 14,
  },
  servicesChipContainer: {
    paddingHorizontal: 0,
  },
  serviceChip: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    position: 'relative',
  },
  serviceChipCovered: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
  },
  serviceChipContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  serviceChipTextCovered: {
    color: '#15803d',
  },
  serviceChipDuration: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  serviceChipDurationCovered: {
    color: '#16a34a',
  },
  serviceCheckMark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  serviceCheckMarkText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  serviceChipPartial: {
    backgroundColor: '#fefce8',
    borderColor: '#eab308',
  },
  serviceChipTextPartial: {
    color: '#a16207',
  },
  serviceChipDurationPartial: {
    color: '#ca8a04',
  },
  servicePartialMark: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#eab308',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  servicePartialMarkText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  chipSeparator: {
    width: 8,
  },
  sequenceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sequenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sequenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  changeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  sequenceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sequenceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sequenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fdf2f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#ec4899',
  },
  sequenceIconText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ec4899',
  },
  sequenceInfo: {
    flex: 1,
  },
  sequenceOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  sequenceOptionDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 16,
  },
  timeEstimate: {
    alignItems: 'flex-end',
  },
  timeLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  professionalsSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  professionalsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  legendContainer: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  legendText: {
    fontSize: 12,
    color: '#0369a1',
    textAlign: 'center',
    fontWeight: '500',
  },
  professionalsContainer: {
    paddingBottom: 8,
  },
  professionalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  professionalChipSelected: {
    borderColor: '#ec4899',
    backgroundColor: '#fdf2f8',
  },
  professionalChipDisabled: {
    opacity: 0.4,
    backgroundColor: '#f9fafb',
  },
  professionalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  professionalAvatarSelected: {
    backgroundColor: '#ec4899',
  },
  professionalAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  professionalAvatarTextSelected: {
    color: 'white',
  },
  professionalAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  professionalChipInfo: {
    flex: 1,
  },
  professionalChipName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  professionalChipNameSelected: {
    color: '#be185d',
  },
  professionalChipNameDisabled: {
    color: '#9ca3af',
  },
  professionalChipServices: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 14,
    flexWrap: 'wrap',
  },
  professionalChipServicesSelected: {
    color: '#be185d',
  },
  professionalChipServicesDisabled: {
    color: '#9ca3af',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  selectedIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  professionalSeparator: {
    height: 12,
  },
  
  // Carousel Styles
  professionalsCarousel: {
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  carouselSeparator: {
    width: 12,
  },
  professionalCard: {
    width: 130,
    marginVertical: 4,
  },
  professionalCardContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100,
  },
  professionalCardSelected: {
    borderColor: '#ec4899',
    backgroundColor: '#fdf2f8',
    shadowColor: '#ec4899',
    shadowOpacity: 0.2,
  },
  professionalCardDisabled: {
    opacity: 0.4,
    backgroundColor: '#f9fafb',
  },
  professionalCardOptimal: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
  },
  professionalCardWarning: {
    borderColor: '#f59e0b',
    backgroundColor: '#fefce8',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.2,
  },
  professionalCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'center',
  },
  professionalCardAvatarSelected: {
    backgroundColor: '#ec4899',
  },
  professionalCardAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  professionalCardAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
  professionalCardAvatarTextSelected: {
    color: 'white',
  },
  professionalCardInfo: {
    alignItems: 'center',
    marginBottom: 4,
  },
  professionalCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  professionalCardNameSelected: {
    color: '#be185d',
  },
  professionalCardNameDisabled: {
    color: '#9ca3af',
  },
  professionalCardServices: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 14,
  },
  professionalCardServicesSelected: {
    color: '#be185d',
  },
  professionalCardServicesDisabled: {
    color: '#9ca3af',
  },
  professionalCardSelectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  professionalCardSelectedIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  optimalIndicator: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 10,
  },
  optimalIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  warningIndicator: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 10,
  },
  warningIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  bannerSuccess: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  bannerIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  bannerSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: 'white',
    position: 'relative',
  },
  snackbarOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 1000,
  },
  snackbarWarning: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  snackbarGuide: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1', // Indigo for friendly guidance
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  snackbarSuccess: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  snackbarIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#f8fafc',
  },
  snackbarIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  snackbarContent: {
    flex: 1,
    paddingTop: 2,
  },
  snackbarTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
    lineHeight: 20,
  },
  snackbarMessage: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6b7280',
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: '#ec4899',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#e5e7eb',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area bottom
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalBody: {
    padding: 20,
  },
  radioOptions: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  radioOptionSelected: {
    borderColor: '#ec4899',
    backgroundColor: '#fdf2f8',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioCircleSelected: {
    borderColor: '#ec4899',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ec4899',
  },
  radioNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    minWidth: 24,
    textAlign: 'center',
  },
  radioContent: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  radioTitleSelected: {
    color: '#be185d',
  },
  radioDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  radioDescriptionSelected: {
    color: '#be185d',
  },
  modalDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalNote: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 16,
    lineHeight: 20,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  modalConfirmButton: {
    backgroundColor: '#ec4899',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default SchedulingWizardProfessionalsScreen;