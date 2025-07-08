/**
 * WizardProfessionalsScreen Component (Web Version)
 * Implements sophisticated algorithmic professional selection from Mobile-client-core
 * Features: Professional state algorithms, service coverage, smart redundancy detection
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, ChevronDown, User, Check, Users, AlertCircle, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useWizardStore } from '../../stores/wizardStore';
import { getAvailableProfessionals } from '../../services/wizardApiService';
import { buildAssetUrl } from '../../utils/urlHelpers';

const WizardProfessionalsScreen = () => {
  const [imageErrors, setImageErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showGuideMessage, setShowGuideMessage] = useState(false);
  const [showProfessionalCountModal, setShowProfessionalCountModal] = useState(false);
  const [showRedundancyAlert, setShowRedundancyAlert] = useState(null);
  
  // Animation refs
  const buttonShakeRef = useRef(null);
  const carouselRef = useRef(null);
  
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
    goToNextStep,
    canProceedToStep,
    updateSelectedProfessional,
    resetFromStep,
  } = useWizardStore();

  // ==========================================
  // SOPHISTICATED BUSINESS LOGIC
  // ==========================================

  // Professional state types
  const PROFESSIONAL_STATES = {
    SELECTED: 'SELECTED',
    OPTIMAL: 'OPTIMAL', 
    AVAILABLE: 'AVAILABLE',
    REDUNDANT: 'REDUNDANT',
    DISABLED: 'DISABLED'
  };

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (isValidSelection()) {
      setShowSuccessMessage(true);
      setShowGuideMessage(false);
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowSuccessMessage(false);
    }
  }, [selectedProfessionals, professionalsRequested]);

  // Show guide message only after user has made some interaction
  useEffect(() => {
    if (!isValidSelection() && getSelectedCount() > 0) {
      setShowGuideMessage(true);
      const timer = setTimeout(() => {
        setShowGuideMessage(false);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setShowGuideMessage(false);
    }
  }, [selectedProfessionals, professionalsRequested]);

  // Load configuration and professionals
  useEffect(() => {
    loadConfiguration();
    loadAvailableProfessionals();
  }, [selectedDate]);

  // Button shake animation when ready
  useEffect(() => {
    if (isValidSelection() && !showSuccessMessage && buttonShakeRef.current) {
      const shakeTimer = setTimeout(() => {
        buttonShakeRef.current.classList.add('animate-shake');
        setTimeout(() => {
          if (buttonShakeRef.current) {
            buttonShakeRef.current.classList.remove('animate-shake');
          }
        }, 500);
      }, 300);
      return () => clearTimeout(shakeTimer);
    }
  }, [selectedProfessionals, professionalsRequested, showSuccessMessage]);

  const loadConfiguration = async () => {
    try {
      // Calculate maximum professionals based on services
      const maxPros = Math.min(
        ...selectedServices.map((service) => service.max_parallel_pros || 1)
      );
      setMaxParallelPros(maxPros);
      
      // Set initial professionals requested
      let initialPros;
      if (selectedServices.length === 1) {
        initialPros = 1;
      } else {
        initialPros = Math.min(defaultProsRequested || 1, maxPros);
      }
      
      setProfessionalsRequested(initialPros);
      
    } catch (err) {
      setError('Erro ao carregar configuração. Tente novamente.');
    }
  };

  const loadAvailableProfessionals = useCallback(async () => {
    if (!selectedDate || selectedServices.length === 0) return;

    setLoading(true);
    clearError();

    try {
      const serviceIds = selectedServices.map(service => service.id);
      const professionals = await getAvailableProfessionals(serviceIds, selectedDate);
      setAvailableProfessionals(professionals);

      // Calculate optimal professionals needed FIRST
      const optimalProfessionalsNeeded = calculateOptimalProfessionalsNeeded(selectedServices, professionals);
      setProfessionalsRequested(optimalProfessionalsNeeded);

      // Auto-select professionals based on service exclusivity
      if (professionals.length === 1) {
        setSelectedProfessionals([professionals[0]]);
        setProfessionalsRequested(1);
      } else {
        // Auto-select professionals who are the only ones that can provide specific services
        const autoSelectedProfessionals = [];
        
        selectedServices.forEach((service) => {
          const capableProfessionals = professionals.filter((prof) => 
            prof.services_offered?.includes(service.id)
          );
          
          if (capableProfessionals.length === 1) {
            const exclusiveProfessional = capableProfessionals[0];
            if (!autoSelectedProfessionals.some(p => p.id === exclusiveProfessional.id)) {
              autoSelectedProfessionals.push(exclusiveProfessional);
            }
          }
        });
        
        if (autoSelectedProfessionals.length > 0) {
          const requiredCount = Math.max(autoSelectedProfessionals.length, optimalProfessionalsNeeded);
          setProfessionalsRequested(requiredCount);
          
          const selectedArray = [...autoSelectedProfessionals];
          while (selectedArray.length < requiredCount) {
            selectedArray.push(null);
          }
          setSelectedProfessionals(selectedArray);
        } else {
          setProfessionalsRequested(optimalProfessionalsNeeded);
          setSelectedProfessionals([]);
        }
      }
      
    } catch (err) {
      setError('Erro ao carregar profissionais. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedServices, setLoading, clearError, setAvailableProfessionals, setError]);

  // ==========================================
  // ALGORITHMIC PROFESSIONAL SELECTION LOGIC
  // ==========================================

  const calculateOptimalProfessionalsNeeded = (services, professionals) => {
    if (services.length === 0 || professionals.length === 0) return 1;
    if (services.length === 1) return 1;
    
    // Check if any single professional can handle ALL services
    const professionalsWhoCanHandleAll = professionals.filter((prof) => {
      return services.every((service) => 
        prof.services_offered?.includes(service.id)
      );
    });
    
    if (professionalsWhoCanHandleAll.length > 0) {
      return 1;
    }
    
    // Enhanced analysis: consider optimal vs minimum scenarios
    const serviceToProfs = new Map();
    services.forEach((service) => {
      const capableProfIds = new Set();
      professionals.forEach((prof) => {
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
      const maxProfessionalsNeeded = Math.min(services.length, professionals.length);
      const allServicesHaveOptions = Array.from(serviceToProfs.values()).every(profSet => profSet.size >= 1);
      if (allServicesHaveOptions && maxProfessionalsNeeded >= 3) {
        return maxProfessionalsNeeded;
      }
    }
    
    if (foundZeroOverlap) {
      return Math.min(2, professionals.length);
    }
    
    return Math.min(2, professionals.length);
  };

  // Core algorithm to determine professional state
  const getProfessionalState = (professional, currentSelected) => {
    // Check if already selected
    const isSelected = currentSelected.some((prof) => prof?.id === professional.id);
    if (isSelected) return PROFESSIONAL_STATES.SELECTED;
    
    // Check if professional can help with any selected services
    if (!professional.services_offered) return PROFESSIONAL_STATES.DISABLED;
    
    const professionalServices = selectedServices.filter((service) => 
      professional.services_offered?.includes(service.id)
    );
    
    if (professionalServices.length === 0) return PROFESSIONAL_STATES.DISABLED;
    
    // Apply algorithm based on sequence type
    const state = professionalsRequested >= 3 
      ? getStateForMultiProfessionalSequence(professional, currentSelected, professionalServices)
      : getStateForSingleOrDualSequence(professional, currentSelected, professionalServices);
    
    return state;
  };

  // Algorithm for sequence = 3+ (Assignment Problem approach)
  const getStateForMultiProfessionalSequence = (professional, currentSelected, _professionalServices) => {
    const selectedCount = currentSelected.filter(prof => prof !== null).length;
    
    // Check if any services are already covered
    const coveredServices = selectedServices.filter((service) => 
      currentSelected.some((selectedProf) => 
        selectedProf && selectedProf.services_offered?.includes(service.id)
      )
    );
    const hasAnyCoverage = coveredServices.length > 0;
    
    // Phase 1: Until we have any coverage, highlight all who can help
    if (selectedCount === 0 || !hasAnyCoverage) {
      const canProvideAnyService = selectedServices.some((service) => 
        professional.services_offered?.includes(service.id)
      );
      return canProvideAnyService ? PROFESSIONAL_STATES.OPTIMAL : PROFESSIONAL_STATES.AVAILABLE;
    }
    
    // Phase 2: We have some coverage, now check for redundancy  
    const uncoveredServices = getUncoveredServicesForAssignment(currentSelected);
    const alreadyCoveredServices = selectedServices.filter((service) => !uncoveredServices.includes(service));
    
    // Get services this professional can provide
    const professionalServices = selectedServices.filter((service) => 
      professional.services_offered?.includes(service.id)
    );
    
    // Check if professional can ONLY provide already-covered services
    const canOnlyProvideCoveredServices = professionalServices.length > 0 && 
      professionalServices.every((service) => alreadyCoveredServices.includes(service));
    
    if (canOnlyProvideCoveredServices) {
      if (uncoveredServices.length > 0) {
        const remainingProfessionalsNeeded = professionalsRequested - selectedCount;
        
        if (remainingProfessionalsNeeded > 1) {
          return PROFESSIONAL_STATES.AVAILABLE;
        } else {
          return PROFESSIONAL_STATES.REDUNDANT;
        }
      } else if (selectedCount < professionalsRequested) {
        return PROFESSIONAL_STATES.AVAILABLE;
      } else {
        return PROFESSIONAL_STATES.REDUNDANT;
      }
    }
    
    if (uncoveredServices.length === 0) {
      if (selectedCount < professionalsRequested) {
        return PROFESSIONAL_STATES.AVAILABLE;
      } else {
        return PROFESSIONAL_STATES.AVAILABLE;
      }
    }
    
    // Check if this professional can help with uncovered services
    const canHelpWithUncovered = uncoveredServices.some((service) => 
      professional.services_offered?.includes(service.id)
    );
    
    return canHelpWithUncovered ? PROFESSIONAL_STATES.OPTIMAL : PROFESSIONAL_STATES.AVAILABLE;
  };

  // Algorithm for sequence = 1-2 (Set Cover approach)
  const getStateForSingleOrDualSequence = (professional, currentSelected, _professionalServices) => {
    const uncoveredServices = selectedServices.filter((service) => {
      return !currentSelected.some((selectedProf) => 
        selectedProf && selectedProf.services_offered?.includes(service.id)
      );
    });
    
    if (uncoveredServices.length === 0) {
      return PROFESSIONAL_STATES.AVAILABLE;
    }
    
    // Check if this professional can help with uncovered services
    const canHelpWithUncovered = uncoveredServices.some((service) => 
      professional.services_offered?.includes(service.id)
    );
    
    if (canHelpWithUncovered) {
      const coverageScore = uncoveredServices.filter((service) => 
        professional.services_offered?.includes(service.id)
      ).length;
      
      return coverageScore > 0 ? PROFESSIONAL_STATES.OPTIMAL : PROFESSIONAL_STATES.AVAILABLE;
    }
    
    return PROFESSIONAL_STATES.REDUNDANT;
  };

  // Get uncovered services for assignment algorithm
  const getUncoveredServicesForAssignment = (currentSelected) => {
    return selectedServices.filter((service) => {
      return !currentSelected.some((selectedProf) => 
        selectedProf && selectedProf.services_offered?.includes(service.id)
      );
    });
  };

  // Service coverage analysis
  const getServiceCoverageStatus = (service) => {
    const canBeHandled = selectedProfessionals.some((prof) => 
      prof && prof.services_offered?.includes(service.id)
    );
    
    const hasCompleteSelection = getSelectedCount() === professionalsRequested;
    
    if (!canBeHandled) return 'uncovered';
    if (hasCompleteSelection) return 'covered';
    return 'partial';
  };

  const getExclusiveServices = (professional) => {
    if (!professional.services_offered || !selectedServices) return [];
    
    const exclusiveServices = selectedServices.filter((selectedService) => {
      if (!professional.services_offered?.includes(selectedService.id)) return false;
      
      const providersCount = availableProfessionals.filter((prof) => 
        prof.services_offered?.includes(selectedService.id)
      ).length;
      
      return providersCount === 1;
    });
    
    return exclusiveServices.map((service) => service.name);
  };

  const getMatchingServices = (professional) => {
    if (!professional.services_offered || !selectedServices) return [];
    
    const matchingServices = selectedServices.filter((selectedService) => 
      professional.services_offered?.includes(selectedService.id)
    );
    
    return matchingServices.map((service) => service.name);
  };

  const getFormattedServices = (professional) => {
    const allServices = getMatchingServices(professional);
    const exclusiveServices = getExclusiveServices(professional);
    
    if (allServices.length === 0) return 'Nenhum serviço selecionado';
    
    const formattedServices = allServices.map((serviceName) => {
      const isExclusive = exclusiveServices.includes(serviceName);
      return isExclusive ? `⭐ ${serviceName}` : serviceName;
    });
    
    return formattedServices.join(' • ');
  };

  // Validation functions
  const isValidSelection = () => {
    const hasServiceCoverage = hasCompleteServiceCoverage();
    const hasRequiredProfessionals = getSelectedCount() === professionalsRequested;
    return hasServiceCoverage && hasRequiredProfessionals;
  };

  const getSelectedCount = () => {
    return selectedProfessionals.filter(prof => prof !== null && prof !== undefined).length;
  };

  const hasCompleteServiceCoverage = () => {
    return selectedServices.every((service) => getServiceCoverageStatus(service) === 'covered');
  };

  const getUncoveredServices = () => {
    return selectedServices
      .filter((service) => getServiceCoverageStatus(service) === 'uncovered')
      .map((service) => service.name);
  };

  // Redundancy detection
  const checkIfSelectionCreatesRedundancy = (professional, currentSelected) => {
    const state = getProfessionalState(professional, currentSelected);
    return state === PROFESSIONAL_STATES.REDUNDANT;
  };

  const getBetterAlternatives = (professional, currentSelected) => {
    const uncoveredServices = selectedServices.filter((service) => {
      const isCovered = currentSelected.some((selectedProf) => 
        selectedProf && selectedProf.services_offered?.includes(service.id)
      );
      return !isCovered;
    });
    
    if (uncoveredServices.length === 0) return [];
    
    const alternatives = availableProfessionals.filter((prof) => {
      if (prof.id === professional.id) return false;
      if (currentSelected.some(selected => selected?.id === prof.id)) return false;
      
      return uncoveredServices.some((service) => 
        prof.services_offered?.includes(service.id)
      );
    });
    
    return alternatives;
  };

  // Professional selection handlers
  const handleProfessionalSelect = (professional) => {
    const isSelected = selectedProfessionals.some((prof) => prof?.id === professional.id);
    
    if (isSelected) {
      // Remove professional
      const newSelected = selectedProfessionals.filter((prof) => prof?.id !== professional.id);
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
        showRedundancyGuidance(professional);
        return;
      }
      
      const firstEmptyIndex = newSelected.findIndex((prof) => prof === null);
      
      if (firstEmptyIndex !== -1) {
        newSelected[firstEmptyIndex] = professional;
        setSelectedProfessionals(newSelected);
      } else if (newSelected.length < professionalsRequested) {
        newSelected.push(professional);
        setSelectedProfessionals(newSelected);
      }
    }
    
    resetFromStep(3);
  };

  const showRedundancyGuidance = (professional) => {
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
    
    if (professionalsRequested >= 3 && uncoveredServices.length > 0) {
      message = `Para maior eficiência, considere selecionar profissionais que cubram serviços diferentes.\n\nServiços ainda não cobertos: ${uncoveredServices.join(', ')}`;
      
      if (alternatives.length > 0) {
        const alternativeNames = alternatives.slice(0, 2).map(alt => alt.full_name || alt.email).join(' ou ');
        message += `\n\nSugestão: ${alternativeNames} podem cobrir estes serviços.`;
      }
    }
    
    setShowRedundancyAlert({
      title: 'Seleção Inteligente',
      message,
      professional
    });
  };

  // Professional count modal handlers
  const handleProfessionalCountChange = (count) => {
    setProfessionalsRequested(count);
    resetFromStep(3);
    setTimeout(() => {
      setShowProfessionalCountModal(false);
    }, 300);
  };

  const handleImageError = (professionalId) => {
    setImageErrors(prev => ({ ...prev, [professionalId]: true }));
  };

  // Render functions (matching mobile implementation exactly)
  const renderProfessionalAvatar = (professional, size = 40) => {
    const hasError = imageErrors[professional.id];
    // CORRECT FIELD: photo_path (matching mobile implementation)
    const photoPath = professional.photo_path || professional.photo_url; // fallback for legacy support
    const fullPhotoUrl = photoPath ? buildAssetUrl(photoPath) : null;
    const hasValidPhoto = fullPhotoUrl && !hasError;
    
    if (!hasValidPhoto) {
      // Fallback to initials like mobile does
      const initials = (professional.full_name || professional.email || 'U').charAt(0).toUpperCase();
      return (
        <div 
          className={`rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium`}
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {initials}
        </div>
      );
    }
    
    return (
      <img
        src={fullPhotoUrl}
        alt={professional.full_name || professional.email}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => handleImageError(professional.id)}
        onLoad={() => handleImageLoad(professional.id)}
      />
    );
  };

  const handleImageLoad = (professionalId) => {
    setImageErrors(prev => ({ ...prev, [professionalId]: false }));
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (minutes === undefined || minutes === null || minutes <= 0) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim() || '-';
  };

  // Render services summary with coverage indicators (Mobile-style floating icons)
  const renderServicesHeader = () => (
    <div className="sticky top-0 bg-white z-10 p-3 border-b border-gray-200">
      <div className="flex overflow-x-auto gap-2 scrollbar-hide">
        {selectedServices.map((service, index) => {
          const status = getServiceCoverageStatus(service);
          return (
            <div
              key={service.id || index}
              className="relative flex-shrink-0"
            >
              {/* Service chip with consistent size */}
              <div className="bg-white border border-gray-200 rounded-full px-2.5 py-1.5 min-w-16">
                <div className="text-center">
                  <div className="text-xs font-medium text-gray-800 leading-tight">
                    {service.name}
                  </div>
                  <div className="text-xs text-gray-500 leading-tight">
                    {formatDuration(service.duration_minutes)}
                  </div>
                </div>
              </div>
              
              {/* Floating status indicators (positioned over and above) */}
              {status === 'covered' && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-xs leading-none">✓</span>
                </div>
              )}
              {status === 'partial' && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-500 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white text-xs leading-none">⏳</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render professional count selector
  const renderProfessionalCountSelector = () => {
    const canChangeCount = maxParallelPros > 1;
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Users size={20} className="text-pink-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Quantos profissionais?</h3>
              <p className="text-sm text-gray-500">
                {canChangeCount 
                  ? `Escolha de 1 a ${maxParallelPros} profissionais`
                  : 'Apenas 1 profissional disponível'
                }
              </p>
            </div>
          </div>
          
          {canChangeCount ? (
            <button
              onClick={() => setShowProfessionalCountModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-smooth"
            >
              <span className="font-medium text-gray-900">{professionalsRequested}</span>
              <ChevronDown size={16} className="text-gray-500" />
            </button>
          ) : (
            <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg">
              <span className="font-medium text-gray-600">1</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render professional card with algorithmic state (Mobile-style compact layout)
  const renderProfessionalCard = (professional) => {
    const professionalState = getProfessionalState(professional, selectedProfessionals);
    const exclusiveServices = getExclusiveServices(professional);
    
    // Get card styling based on state (matching mobile styling)
    const getCardStyling = () => {
      switch (professionalState) {
        case PROFESSIONAL_STATES.SELECTED:
          return 'bg-pink-50 border-pink-500 border-2 shadow-md shadow-pink-200';
        case PROFESSIONAL_STATES.OPTIMAL:
          return 'bg-green-50 border-green-500 border-2 shadow-md shadow-green-200';
        case PROFESSIONAL_STATES.AVAILABLE:
          return 'bg-white border-gray-300 hover:shadow-md';
        case PROFESSIONAL_STATES.REDUNDANT:
          return 'bg-gray-100 border-gray-300 opacity-40';
        case PROFESSIONAL_STATES.DISABLED:
          return 'bg-gray-100 border-gray-200 opacity-40';
        default:
          return 'bg-white border-gray-200';
      }
    };

    const isDisabled = professionalState === PROFESSIONAL_STATES.DISABLED || 
                      professionalState === PROFESSIONAL_STATES.REDUNDANT;
    const isClickable = !isDisabled;

    return (
      <div
        key={professional.id}
        onClick={isClickable ? () => handleProfessionalSelect(professional) : undefined}
        className={`relative p-3 rounded-xl border transition-smooth min-h-24 ${getCardStyling()} ${
          isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
        }`}
      >
        {/* Mobile-style portrait layout: avatar centered at top */}
        <div className="flex flex-col items-center text-center">
          {/* Avatar centered at top */}
          <div className="mb-2">
            {renderProfessionalAvatar(professional, 40)}
          </div>
          
          {/* Name (centered, compact) */}
          <h5 className="text-sm font-semibold text-gray-900 mb-1 leading-tight truncate w-full">
            {professional.full_name || professional.email}
          </h5>
          
          {/* Services (compact, centered) - matching mobile formatting */}
          <div className="text-xs text-gray-600 leading-tight">
            <p className="truncate w-full">{getFormattedServices(professional)}</p>
          </div>
          
          {/* Exclusive services indicator (if any) */}
          {exclusiveServices.length > 0 && (
            <div className="mt-1 text-xs text-amber-700 bg-amber-50 px-1 py-0.5 rounded text-center w-full truncate">
              ⭐ Exclusivo
            </div>
          )}
        </div>

        {/* Selection indicator (top-right corner) */}
        {professionalState === PROFESSIONAL_STATES.SELECTED && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center shadow-sm">
            <Check size={12} className="text-white" />
          </div>
        )}
        
        {/* Optimal state indicator (top-left corner) */}
        {professionalState === PROFESSIONAL_STATES.OPTIMAL && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full"></div>
        )}
        
        {/* Redundant state indicator */}
        {professionalState === PROFESSIONAL_STATES.REDUNDANT && (
          <div className="absolute -top-1 -right-1">
            <AlertCircle size={14} className="text-yellow-600" />
          </div>
        )}
      </div>
    );
  };

  // Render professional carousel (Mobile-style compact cards)
  const renderProfessionalCarousel = () => (
    <div className="p-4">
      <div 
        ref={carouselRef}
        className="flex overflow-x-auto space-x-3 scrollbar-hide pb-4"
        style={{ 
          scrollSnapType: 'x mandatory',
          scrollPadding: '0 16px'
        }}
      >
        {availableProfessionals.map(professional => (
          <div 
            key={professional.id} 
            className="flex-shrink-0 w-32" 
            style={{ scrollSnapAlign: 'start' }}
          >
            {renderProfessionalCard(professional)}
          </div>
        ))}
      </div>
    </div>
  );

  // Render professional count modal
  const renderProfessionalCountModal = () => {
    if (!showProfessionalCountModal) return null;
    
    const countOptions = Array.from({ length: maxParallelPros }, (_, i) => i + 1);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-sm w-full shadow-xl">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Quantos profissionais?
            </h3>
          </div>
          
          <div className="p-4">
            {countOptions.map(count => (
              <button
                key={count}
                onClick={() => handleProfessionalCountChange(count)}
                className={`w-full flex items-center justify-between p-3 rounded-lg mb-2 transition-smooth ${
                  count === professionalsRequested
                    ? 'bg-pink-50 border-2 border-pink-200'
                    : 'hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span className="font-medium text-gray-900">
                  {count} profissional{count > 1 ? 'is' : ''}
                </span>
                {count === professionalsRequested && (
                  <Check size={20} className="text-pink-600" />
                )}
              </button>
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setShowProfessionalCountModal(false)}
              className="w-full py-3 text-gray-600 font-medium hover:text-gray-800 transition-smooth"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render redundancy alert modal
  const renderRedundancyAlert = () => {
    if (!showRedundancyAlert) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {showRedundancyAlert.title}
              </h3>
              <button
                onClick={() => setShowRedundancyAlert(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="p-4">
            <p className="text-gray-700 whitespace-pre-line">
              {showRedundancyAlert.message}
            </p>
          </div>
          
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setShowRedundancyAlert(null)}
              className="w-full py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-smooth"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render loading state
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 size={32} className="spinner text-pink-500 mb-4" />
      <p className="text-gray-600">Carregando profissionais disponíveis...</p>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="text-center py-16">
      <p className="text-red-600 mb-4">{error}</p>
      <button
        onClick={loadAvailableProfessionals}
        className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-smooth"
      >
        Tentar novamente
      </button>
    </div>
  );

  // Render continue button
  const renderContinueButton = () => {
    const canContinue = isValidSelection();
    
    return (
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          ref={buttonShakeRef}
          onClick={() => {
            if (canContinue) {
              goToNextStep();
            }
          }}
          disabled={!canContinue}
          className={`w-full py-4 rounded-xl font-semibold transition-smooth ${
            canContinue
              ? 'bg-pink-500 text-white hover:bg-pink-600'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canContinue ? 'Continuar' : `Selecione ${professionalsRequested} profissional${professionalsRequested > 1 ? 'is' : ''}`}
        </button>
      </div>
    );
  };

  // Render mobile-style snackbar notifications (exact mobile implementation)
  const renderSnackbarNotifications = () => (
    <>
      {/* Success Message Snackbar */}
      {showSuccessMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-white rounded-2xl shadow-lg border-l-4 border-green-500 px-5 py-4 flex items-start space-x-4">
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">✓</span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-0.5 leading-5">
              Tudo pronto!
            </h4>
            <p className="text-xs text-gray-600 leading-[18px]">
              {professionalsRequested === 1 
                ? 'Profissional selecionado e serviços cobertos'
                : `${professionalsRequested} profissionais selecionados e serviços cobertos`
              }
            </p>
          </div>
        </div>
      )}
      
      {/* Guide Message Snackbar */}
      {showGuideMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-white rounded-2xl shadow-lg border-l-4 border-indigo-500 border border-indigo-100 px-5 py-4 flex items-start space-x-4">
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">
              {getSelectedCount() < professionalsRequested ? '✨' : '📋'}
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-0.5 leading-5">
              {getSelectedCount() < professionalsRequested
                ? 'Quase lá!'
                : 'Verificando serviços'
              }
            </h4>
            <p className="text-xs text-gray-600 leading-[18px]">
              {getSelectedCount() < professionalsRequested
                ? `Selecione mais ${professionalsRequested - getSelectedCount()} profissional${professionalsRequested - getSelectedCount() > 1 ? 'is' : ''} para continuar`
                : `Verifique se todos os serviços estão cobertos: ${getUncoveredServices().join(', ')}`
              }
            </p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Services Header */}
      {renderServicesHeader()}
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="p-4">
          {/* Professional Count Selector */}
          {renderProfessionalCountSelector()}
          
          {/* Main Content */}
          {isLoading ? (
            renderLoadingState()
          ) : error ? (
            renderErrorState()
          ) : (
            renderProfessionalCarousel()
          )}
        </div>
      </div>
      
      {/* Mobile-Style Snackbar Notifications */}
      {renderSnackbarNotifications()}
      
      {/* Modals */}
      {renderProfessionalCountModal()}
      {renderRedundancyAlert()}
      
      {/* Continue Button */}
      {renderContinueButton()}
      
      {/* Custom Styles */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default WizardProfessionalsScreen;