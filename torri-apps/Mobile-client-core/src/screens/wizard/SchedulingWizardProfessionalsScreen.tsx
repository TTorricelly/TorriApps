import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Image, Modal } from 'react-native';
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
    loadConfiguration();
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
          // If we need more professionals than currently requested, auto-update the count
          if (autoSelectedProfessionals.length > professionalsRequested) {
            setProfessionalsRequested(autoSelectedProfessionals.length);
          }
          
          // Fill remaining slots with null to maintain array structure
          const selectedArray = [...autoSelectedProfessionals];
          const requiredCount = Math.max(professionalsRequested, autoSelectedProfessionals.length);
          while (selectedArray.length < requiredCount) {
            selectedArray.push(null);
          }
          setSelectedProfessionals(selectedArray);
        } else {
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
      // Add professional to first available slot
      const newSelected = [...selectedProfessionals];
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

  const isServiceCovered = (service: Service): boolean => {
    // Simple check: if any selected professional can provide this service, it's covered
    return selectedProfessionals.some((prof: Professional | null) => 
      prof && prof.services_offered?.includes(service.id)
    );
  };

  const renderServiceChip = ({ item: service }: { item: Service }) => {
    const isCovered = isServiceCovered(service);
    
    return (
      <View style={[
        styles.serviceChip,
        isCovered && styles.serviceChipCovered
      ]}>
        <View style={styles.serviceChipContent}>
          <Text style={[
            styles.serviceChipText,
            isCovered && styles.serviceChipTextCovered
          ]}>
            {service.name}
          </Text>
          <Text style={[
            styles.serviceChipDuration,
            isCovered && styles.serviceChipDurationCovered
          ]}>
            {service.duration_minutes}min
          </Text>
        </View>
        {isCovered && (
          <View style={styles.serviceCheckMark}>
            <Text style={styles.serviceCheckMarkText}>✓</Text>
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
      .filter((service: Service) => !isServiceCovered(service))
      .map((service: Service) => service.name);
  };

  const hasCompleteServiceCoverage = (): boolean => {
    return selectedServices.every((service: Service) => isServiceCovered(service));
  };

  const isValidSelection = (): boolean => {
    const hasServiceCoverage = hasCompleteServiceCoverage();
    const hasRequiredProfessionals = getSelectedCount() === professionalsRequested;
    return hasServiceCoverage && hasRequiredProfessionals;
  };

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
    
    // Simplified logic: Allow selection up to professionalsRequested count
    // This ensures that when user sets to 2 pros, they can select 2 professionals
    const canSelect = !isSelected && getSelectedCount() < professionalsRequested;
    
    const isOnlyOption = availableProfessionals.length === 1;
    const isDisabled = !isSelected && !canSelect;
    
    // Debug logging to understand what's happening
    console.log(`Professional ${professional.full_name}: isSelected=${isSelected}, getSelectedCount()=${getSelectedCount()}, professionalsRequested=${professionalsRequested}, canSelect=${canSelect}, isDisabled=${isDisabled}`);
    const imageError = imageErrors[professional.id] || false;
    
    // Process photo URL using best practices - API returns photo_path, not photo_url
    const photoPath = professional.photo_path; // API returns photo_path field
    const fullPhotoUrl = buildAssetUrl(photoPath);
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
              <View style={styles.servicesSummaryHeader}>
                <Text style={styles.servicesSummaryTitle}>Serviços selecionados</Text>
                <View style={styles.summaryHeaderRight}>
                  <Text style={styles.totalTimeText}>
                    {formatDuration(getTotalEstimatedTime())}
                  </Text>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={handleEditServices}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editButtonText}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
              />
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
              {availableProfessionals.length > 1 && selectedServices.length > 1 && (
                <Text style={styles.professionalsSubtitle}>
                  {getSelectedCount()}/{professionalsRequested} selecionado{professionalsRequested > 1 ? 's' : ''}
                </Text>
              )}
              
              {/* Legend for exclusive services */}
              {hasExclusiveServices() && (
                <View style={styles.legendContainer}>
                  <Text style={styles.legendText}>⭐ Serviço exclusivo deste profissional</Text>
                </View>
              )}
              
              <FlatList
                data={availableProfessionals}
                renderItem={renderProfessionalChip}
                keyExtractor={(item: Professional) => item.id}
                numColumns={1}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.professionalsContainer}
                ItemSeparatorComponent={() => <View style={styles.professionalSeparator} />}
                scrollEnabled={false}
                nestedScrollEnabled={true}
              />
            </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Continue Button */}
      {!isLoading && !error && availableProfessionals.length > 0 && (
        <View style={styles.footer}>
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
          
          {/* Modern Overlay Snackbars */}
          {!isValidSelection() && (
            <View style={[styles.snackbarOverlay, styles.snackbarWarning]}>
              <View style={styles.snackbarIconContainer}>
                <Text style={styles.snackbarIcon}>⚠️</Text>
              </View>
              <View style={styles.snackbarContent}>
                <Text style={styles.snackbarTitle}>
                  {getSelectedCount() === 0 
                    ? 'Seleção necessária' 
                    : getSelectedCount() < professionalsRequested
                      ? 'Profissionais insuficientes'
                      : 'Serviços pendentes'
                  }
                </Text>
                <Text style={styles.snackbarMessage}>
                  {getSelectedCount() === 0 
                    ? 'Escolha pelo menos um profissional'
                    : getSelectedCount() < professionalsRequested
                      ? `Selecione ${professionalsRequested - getSelectedCount()} profissional${professionalsRequested - getSelectedCount() > 1 ? 'is' : ''} adicional${professionalsRequested - getSelectedCount() > 1 ? 'is' : ''}`
                      : getUncoveredServices().join(', ')
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
                <TouchableOpacity 
                  style={[
                    styles.radioOption,
                    professionalsRequested === 1 && styles.radioOptionSelected
                  ]}
                  onPress={() => handleProfessionalsCountChange(1)}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioButton}>
                    <View style={[
                      styles.radioCircle,
                      professionalsRequested === 1 && styles.radioCircleSelected
                    ]}>
                      {professionalsRequested === 1 && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.radioNumber}>1</Text>
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={[
                      styles.radioTitle,
                      professionalsRequested === 1 && styles.radioTitleSelected
                    ]}>
                      1 Profissional
                    </Text>
                    <Text style={[
                      styles.radioDescription,
                      professionalsRequested === 1 && styles.radioDescriptionSelected
                    ]}>
                      Serviços em sequência
                    </Text>
                  </View>
                </TouchableOpacity>
                
                {selectedServices.length > 1 && (
                  <TouchableOpacity 
                    style={[
                      styles.radioOption,
                      professionalsRequested >= 2 && styles.radioOptionSelected
                    ]}
                    onPress={() => handleProfessionalsCountChange(2)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioButton}>
                      <View style={[
                        styles.radioCircle,
                        professionalsRequested >= 2 && styles.radioCircleSelected
                      ]}>
                        {professionalsRequested >= 2 && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.radioNumber}>2+</Text>
                    </View>
                    <View style={styles.radioContent}>
                      <Text style={[
                        styles.radioTitle,
                        professionalsRequested >= 2 && styles.radioTitleSelected
                      ]}>
                        2+ Profissionais
                      </Text>
                      <Text style={[
                        styles.radioDescription,
                        professionalsRequested >= 2 && styles.radioDescriptionSelected
                      ]}>
                        {maxParallelPros > 1 
                          ? 'Ao mesmo tempo • mais rápido'
                          : 'Especialistas diferentes'
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
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
    paddingBottom: 8,
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
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
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
  chipSeparator: {
    width: 8,
  },
  sequenceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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
    marginVertical: 24,
  },
  professionalsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  professionalsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  legendContainer: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 16,
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