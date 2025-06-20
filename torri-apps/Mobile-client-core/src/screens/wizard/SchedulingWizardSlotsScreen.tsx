import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WizardHeader, WizardContainer, ItineraryCard } from '../../components/wizard';
import { useWizardStore } from '../../store/wizardStore';
import { wizardApiService } from '../../services/wizardApiService';
import { WizardNavigationProp } from '../../Navigation/SchedulingWizardNavigator';

type SchedulingWizardSlotsScreenNavigationProp = WizardNavigationProp<'WizardSlots'>;

const SchedulingWizardSlotsScreen: React.FC = () => {
  const navigation = useNavigation<SchedulingWizardSlotsScreenNavigationProp>();
  
  const {
    selectedServices,
    selectedDate,
    professionalsRequested,
    selectedProfessionals,
    availableSlots,
    selectedSlot,
    visibleSlots,
    isLoading,
    error,
    setAvailableSlots,
    setSelectedSlot,
    setVisibleSlots,
    showMoreSlots,
    setLoading,
    setError,
    clearError,
    setCurrentStep,
    goToNextStep,
    goToPreviousStep,
    canProceedToStep,
    getSelectedServiceIds,
    getSelectedProfessionalIds,
  } = useWizardStore();

  useEffect(() => {
    setCurrentStep(3);
    loadAvailableSlots();
  }, [selectedProfessionals]);

  const loadAvailableSlots = async () => {
    if (!selectedDate || selectedServices.length === 0 || selectedProfessionals.length === 0) {
      return;
    }

    setLoading(true);
    clearError();

    try {
      const serviceIds = getSelectedServiceIds();
      const professionalIds = getSelectedProfessionalIds();

      const slots = await wizardApiService.getAvailableSlots({
        serviceIds,
        date: selectedDate,
        professionalsRequested,
        professionalIds: professionalIds.length > 0 ? professionalIds : undefined,
      });

      setAvailableSlots(slots);
      setVisibleSlots(3); // Reset visible slots
      
    } catch (error) {
      console.error('Error loading available slots:', error);
      setError('Erro ao carregar horários disponíveis. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: any) => {
    setSelectedSlot(slot);
  };

  const handleShowMore = () => {
    showMoreSlots();
  };

  const handleConfirm = () => {
    if (canProceedToStep(4)) {
      goToNextStep();
      navigation.navigate('WizardConfirmation');
    }
  };

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  const canConfirm = canProceedToStep(4);
  const hasMoreSlots = visibleSlots < availableSlots.length;

  const renderSlotItem = ({ item, index }: { item: any; index: number }) => {
    if (index >= visibleSlots) return null;

    return (
      <ItineraryCard
        slot={item}
        isSelected={selectedSlot?.id === item.id}
        onSelect={() => handleSlotSelect(item)}
      />
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#ec4899" />
      <Text style={styles.loadingText}>Carregando horários disponíveis...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={loadAvailableSlots}
      >
        <Text style={styles.retryButtonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Nenhum horário disponível</Text>
      <Text style={styles.emptyText}>
        Não há horários disponíveis para a combinação selecionada. Tente:
      </Text>
      <View style={styles.suggestionsList}>
        <Text style={styles.suggestionItem}>• Escolher outro dia</Text>
        <Text style={styles.suggestionItem}>• Selecionar outros profissionais</Text>
        <Text style={styles.suggestionItem}>• Usar apenas 1 profissional</Text>
      </View>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>Resumo da seleção:</Text>
      <Text style={styles.summaryItem}>
        📅 {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })}
      </Text>
      <Text style={styles.summaryItem}>
        👥 {professionalsRequested} profissional{professionalsRequested > 1 ? 'is' : ''}
      </Text>
      <Text style={styles.summaryItem}>
        🛍️ {selectedServices.length} serviço{selectedServices.length > 1 ? 's' : ''}
      </Text>
    </View>
  );

  const renderSlotsList = () => (
    <>
      <FlatList
        data={availableSlots}
        keyExtractor={(item) => item.id}
        renderItem={renderSlotItem}
        style={styles.slotsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.slotsListContent}
        ListHeaderComponent={
          <View style={styles.slotsHeader}>
            <Text style={styles.slotsTitle}>
              Horários disponíveis ({availableSlots.length})
            </Text>
            <Text style={styles.slotsSubtitle}>
              Selecione o horário que melhor se adequa à sua agenda
            </Text>
          </View>
        }
        ListFooterComponent={
          hasMoreSlots ? (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={handleShowMore}
            >
              <Text style={styles.showMoreText}>
                Ver mais horários ({availableSlots.length - visibleSlots} restantes)
              </Text>
            </TouchableOpacity>
          ) : availableSlots.length > 3 ? (
            <View style={styles.allSlotsShown}>
              <Text style={styles.allSlotsText}>
                Todos os horários foram exibidos
              </Text>
            </View>
          ) : null
        }
      />
    </>
  );

  return (
    <WizardContainer>
      <WizardHeader
        currentStep={3}
        totalSteps={4}
        title="Horários disponíveis"
        onBack={handleBack}
      />

      {renderSummary()}

      {isLoading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : availableSlots.length === 0 ? (
        renderEmptyState()
      ) : (
        <View style={styles.content}>
          {renderSlotsList()}
        </View>
      )}

      {/* Selected Slot Summary */}
      {selectedSlot && (
        <View style={styles.selectedSlotSummary}>
          <View style={styles.selectedSlotInfo}>
            <Text style={styles.selectedSlotTitle}>Horário selecionado:</Text>
            <Text style={styles.selectedSlotTime}>
              {selectedSlot.start_time.substring(0, 5)} - {selectedSlot.end_time.substring(0, 5)}
            </Text>
            <Text style={styles.selectedSlotDetails}>
              {selectedSlot.total_duration_minutes} min • R$ {selectedSlot.total_price.toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </View>
      )}

      {/* Confirm Button */}
      {!isLoading && !error && availableSlots.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !canConfirm && styles.disabledButton,
            ]}
            onPress={handleConfirm}
            disabled={!canConfirm}
          >
            <Text style={[
              styles.confirmButtonText,
              !canConfirm && styles.disabledButtonText,
            ]}>
              {selectedSlot ? 'Confirmar agendamento' : 'Selecione um horário'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </WizardContainer>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  content: {
    flex: 1,
  },
  slotsHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  slotsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  slotsSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  slotsList: {
    flex: 1,
  },
  slotsListContent: {
    paddingBottom: 16,
  },
  showMoreButton: {
    backgroundColor: '#f3f4f6',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  allSlotsShown: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  allSlotsText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  selectedSlotSummary: {
    backgroundColor: '#fdf2f8',
    borderTopWidth: 1,
    borderTopColor: '#f3e8ff',
    padding: 16,
  },
  selectedSlotInfo: {
    alignItems: 'center',
  },
  selectedSlotTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7c3aed',
    marginBottom: 4,
  },
  selectedSlotTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectedSlotDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: 'white',
  },
  confirmButton: {
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
  confirmButtonText: {
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
    marginBottom: 16,
  },
  suggestionsList: {
    alignItems: 'flex-start',
  },
  suggestionItem: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
});

export default SchedulingWizardSlotsScreen;