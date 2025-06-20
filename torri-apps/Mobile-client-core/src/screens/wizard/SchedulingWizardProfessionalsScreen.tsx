import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WizardHeader, WizardContainer, ProfessionalToggle, ProfessionalDropdown } from '../../components/wizard';
import { useWizardStore } from '../../store/wizardStore';
import { wizardApiService } from '../../services/wizardApiService';
import { WizardNavigationProp } from '../../Navigation/SchedulingWizardNavigator';

type SchedulingWizardProfessionalsScreenNavigationProp = WizardNavigationProp<'WizardProfessionals'>;

const SchedulingWizardProfessionalsScreen: React.FC = () => {
  const navigation = useNavigation<SchedulingWizardProfessionalsScreenNavigationProp>();
  
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
    updateSelectedProfessional,
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
        ...selectedServices.map(service => service.max_parallel_pros)
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
      const serviceIds = selectedServices.map(service => service.id);
      const professionals = await wizardApiService.getAvailableProfessionals(
        serviceIds,
        selectedDate
      );
      
      setAvailableProfessionals(professionals);
      
      // Reset selected professionals when available professionals change
      setSelectedProfessionals([]);
      
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

  const handleProfessionalSelect = (index: number, professional: any) => {
    updateSelectedProfessional(index, professional);
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

  const getExcludeIds = (currentIndex: number) => {
    return selectedProfessionals
      .filter((_, index) => index !== currentIndex)
      .map(prof => prof?.id)
      .filter(Boolean);
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
        title="Profissionais & paralelismo"
        onBack={handleBack}
      />

      {isLoading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : availableProfessionals.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date and Services Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Resumo da seleção:</Text>
            <Text style={styles.summaryDate}>
              Data: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <Text style={styles.summaryServices}>
              Serviços: {selectedServices.map(s => s.name).join(', ')}
            </Text>
          </View>

          {/* Professional Count Toggle */}
          <ProfessionalToggle
            value={professionalsRequested}
            maxValue={maxParallelPros}
            onChange={handleProfessionalsCountChange}
            disabled={maxParallelPros === 1}
          />

          {/* Professional Selection */}
          <View style={styles.professionalsSection}>
            <Text style={styles.professionalsTitle}>
              Selecione {professionalsRequested === 1 ? 'o profissional' : 'os profissionais'}:
            </Text>
            
            {Array.from({ length: professionalsRequested }).map((_, index) => (
              <ProfessionalDropdown
                key={index}
                label={professionalsRequested === 1 ? 'Profissional' : `Profissional ${index + 1}`}
                professionals={availableProfessionals}
                selectedProfessional={selectedProfessionals[index]}
                onSelect={(professional) => handleProfessionalSelect(index, professional)}
                excludeIds={getExcludeIds(index)}
                placeholder="Selecione um profissional"
              />
            ))}
          </View>

          {/* Available Professionals Info */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>Profissionais disponíveis ({availableProfessionals.length}):</Text>
            {availableProfessionals.map((professional) => (
              <View key={professional.id} style={styles.professionalInfo}>
                <Text style={styles.professionalName}>
                  {professional.full_name || professional.email}
                </Text>
                <Text style={styles.professionalServices}>
                  Serviços: {professional.services_offered.length} disponível(is)
                </Text>
              </View>
            ))}
          </View>

          {/* Validation Messages */}
          {professionalsRequested > 1 && selectedProfessionals.length > 0 && (
            <View style={styles.validationSection}>
              {selectedProfessionals.some(prof => prof === null || prof === undefined) ? (
                <Text style={styles.validationWarning}>
                  ⚠️ Selecione todos os profissionais para continuar
                </Text>
              ) : (
                <Text style={styles.validationSuccess}>
                  ✅ Profissionais selecionados com sucesso
                </Text>
              )}
            </View>
          )}
        </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  summaryDate: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  summaryServices: {
    fontSize: 14,
    color: '#4b5563',
  },
  professionalsSection: {
    marginVertical: 24,
  },
  professionalsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 12,
  },
  professionalInfo: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  professionalName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  professionalServices: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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