import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WizardHeader, WizardContainer, ProfessionalToggle } from '../../components/wizard';
import { useWizardStore } from '../../store/wizardStore';
import { wizardApiService } from '../../services/wizardApiService';
import { WizardNavigationProp } from '../../navigation/SchedulingWizardNavigator';
import { Service, Professional } from '../../types';
import { buildAssetUrl } from '../../utils/urlHelpers';

type SchedulingWizardProfessionalsScreenNavigationProp = WizardNavigationProp<'WizardProfessionals'>;

const SchedulingWizardProfessionalsScreen: React.FC = () => {
  const navigation = useNavigation<SchedulingWizardProfessionalsScreenNavigationProp>();
  const [imageErrors, setImageErrors] = React.useState<{[key: string]: boolean}>({});
  
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
      const initialPros = Math.min(defaultPros, maxPros);
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
      
      // Auto-select if only 1 professional available
      if (professionals.length === 1) {
        setSelectedProfessionals([professionals[0]]);
        setProfessionalsRequested(1);
      } else {
        // Reset selected professionals when available professionals change
        setSelectedProfessionals([]);
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

  const renderServiceChip = ({ item: service }: { item: Service }) => (
    <View style={styles.serviceChip}>
      <Text style={styles.serviceChipText}>{service.name}</Text>
      <Text style={styles.serviceChipDuration}>{service.duration_minutes}min</Text>
    </View>
  );

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

  const renderProfessionalChip = ({ item: professional }: { item: Professional }) => {
    const isSelected = selectedProfessionals.some((prof: Professional | null) => prof?.id === professional.id);
    const canSelect = !isSelected && getSelectedCount() < professionalsRequested;
    const isOnlyOption = availableProfessionals.length === 1;
    const isDisabled = !isSelected && !canSelect;
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
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Services Summary */}
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

            {/* Professional Count Toggle - Only show if multiple services AND multiple professionals available */}
            {availableProfessionals.length > 1 && selectedServices.length > 1 && (
              <ProfessionalToggle
                value={professionalsRequested}
                maxValue={maxParallelPros}
                onChange={handleProfessionalsCountChange}
                disabled={maxParallelPros === 1}
              />
            )}

            {/* Professional Selection */}
            <View style={styles.professionalsSection}>
              <Text style={styles.professionalsTitle}>
                {availableProfessionals.length === 1 
                  ? 'Profissional disponível'
                  : professionalsRequested === 1 
                    ? 'Selecione o profissional' 
                    : `Selecione ${professionalsRequested} profissionais`
                }
              </Text>
              {availableProfessionals.length > 1 && (
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

            {/* Validation Messages */}
            {professionalsRequested > 1 && getSelectedCount() > 0 && (
              <View style={styles.validationSection}>
                {getSelectedCount() < professionalsRequested ? (
                  <Text style={styles.validationWarning}>
                    ⚠️ Selecione mais {professionalsRequested - getSelectedCount()} profissional{professionalsRequested - getSelectedCount() > 1 ? 's' : ''} para continuar
                  </Text>
                ) : (
                  <Text style={styles.validationSuccess}>
                    ✅ Profissionais selecionados com sucesso
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
        </View>
      )}
    </WizardContainer>
  );
};

const styles = StyleSheet.create({
  container: {
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
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  serviceChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  serviceChipDuration: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  chipSeparator: {
    width: 8,
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
  validationSection: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  validationWarning: {
    fontSize: 14,
    color: '#f59e0b',
    textAlign: 'center',
  },
  validationSuccess: {
    fontSize: 14,
    color: '#10b981',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: 'white',
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
});

export default SchedulingWizardProfessionalsScreen;