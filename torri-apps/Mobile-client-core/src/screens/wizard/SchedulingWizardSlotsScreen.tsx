import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WizardHeader, WizardContainer, ItineraryCard } from '../../components/wizard';
import { useWizardStore } from '../../store/wizardStore';
import { wizardApiService } from '../../services/wizardApiService';
import { WizardNavigationProp } from '../../navigation/SchedulingWizardNavigator';
import { formatDuration } from '../../utils/dateUtils';

type SchedulingWizardSlotsScreenNavigationProp = WizardNavigationProp<'WizardSlots'>;

const SchedulingWizardSlotsScreen: React.FC = () => {
  const navigation = useNavigation<SchedulingWizardSlotsScreenNavigationProp>();
  
  // Local state for progressive loading
  const [visibleCount, setVisibleCount] = useState(8); // Start with 8 slots (improved from 3)
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showAllSlots, setShowAllSlots] = useState(false);
  
  const {
    selectedServices,
    selectedDate,
    professionalsRequested,
    selectedProfessionals,
    availableSlots,
    selectedSlot,
    isLoading,
    error,
    setAvailableSlots,
    setSelectedSlot,
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
    // Reset visible count when slots change
    setVisibleCount(8);
    setShowAllSlots(false);
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
      // Reset local progressive loading state
      setVisibleCount(8);
      setShowAllSlots(false);
      
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

  // Helper function to format time for grid display
  const formatTimeForGrid = (timeString: string) => {
    // Extract time from "HH:MM:SS" or "HH:MM" format
    return timeString.substring(0, 5);
  };

  // Progressive loading functions
  const handleLoadMore = () => {
    if (!isLoadingMore && visibleCount < availableSlots.length) {
      setIsLoadingMore(true);
      
      // Simulate loading delay for better UX
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 6, availableSlots.length));
        setIsLoadingMore(false);
      }, 300);
    }
  };

  const handleShowAllSlots = () => {
    setShowAllSlots(true);
    setVisibleCount(availableSlots.length);
  };

  const onEndReached = () => {
    if (!showAllSlots) {
      handleLoadMore();
    }
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
  const hasMoreSlots = visibleCount < availableSlots.length;
  const currentSlots = showAllSlots ? availableSlots : availableSlots.slice(0, visibleCount);

  const renderSlotItem = ({ item }: { item: any }) => {
    return (
      <ItineraryCard
        slot={item}
        isSelected={selectedSlot?.id === item.id}
        onSelect={() => handleSlotSelect(item)}
      />
    );
  };

  // Time grid item for single service bookings
  const renderTimeGridItem = (slot: any) => {
    const isSelected = selectedSlot?.id === slot.id;
    const isUnavailable = slot.status === 'unavailable'; // Assuming unavailable slots are marked
    
    return (
      <Pressable
        key={slot.id}
        style={[
          styles.timeGridSlot,
          isSelected && styles.timeGridSlotSelected,
          isUnavailable && styles.timeGridSlotUnavailable,
        ]}
        onPress={() => !isUnavailable && handleSlotSelect(slot)}
        disabled={isUnavailable}
        android_ripple={{ color: '#ec489950' }}
      >
        <Text style={[
          styles.timeGridText,
          isSelected && styles.timeGridTextSelected,
          isUnavailable && styles.timeGridTextUnavailable,
        ]}>
          {formatTimeForGrid(slot.start_time)}
        </Text>
      </Pressable>
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

  const renderSummary = () => {
    // Format date for chip
    const formatDateChip = (date: string) => {
      const dateObj = new Date(date + 'T00:00:00');
      return dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    };

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.compactChipsRow}>
          {/* Date Chip */}
          <View style={styles.compactChip}>
            <Text style={styles.compactChipText}>📅 {formatDateChip(selectedDate)}</Text>
          </View>
        </View>
      </View>
    );
  };

  // Time Grid for single service
  const renderTimeGrid = () => (
    <ScrollView 
      style={styles.timeGridContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.timeGridContent}
    >
      <View style={styles.timeGrid}>
        {availableSlots.map((slot: any) => renderTimeGridItem(slot))}
      </View>
    </ScrollView>
  );

  // Itinerary List for multi-service
  const renderSlotsList = () => (
    <>
      <FlatList
        data={currentSlots}
        keyExtractor={(item) => item.id}
        renderItem={renderSlotItem}
        style={styles.slotsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.slotsListContent}
        // Infinite scroll configuration
        onEndReached={onEndReached}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={null}
        ListFooterComponent={
          <View style={styles.footerContainer}>
            {/* Loading more indicator */}
            {isLoadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#ec4899" />
                <Text style={styles.loadingMoreText}>Carregando mais horários...</Text>
              </View>
            )}
            
            {/* Show all button */}
            {hasMoreSlots && !isLoadingMore && !showAllSlots && (
              <TouchableOpacity
                style={styles.showAllButton}
                onPress={handleShowAllSlots}
              >
                <Text style={styles.showAllText}>
                  Ver todos os horários ({availableSlots.length - visibleCount} restantes)
                </Text>
              </TouchableOpacity>
            )}
            
            {/* All slots shown message */}
            {showAllSlots && availableSlots.length > 8 && (
              <View style={styles.allSlotsShown}>
                <Text style={styles.allSlotsText}>
                  ✓ Todos os horários foram exibidos
                </Text>
              </View>
            )}
          </View>
        }
      />
    </>
  );

  return (
    <WizardContainer>
      <WizardHeader
        currentStep={3}
        totalSteps={4}
        title="Horários"
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
          {selectedServices.length === 1 ? renderTimeGrid() : renderSlotsList()}
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
              {formatDuration(selectedSlot.total_duration_minutes)} • R$ {selectedSlot.total_price.toFixed(2).replace('.', ',')}
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
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  compactChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactChip: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  compactPriceChip: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  compactChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  compactPriceText: {
    color: '#92400e',
    fontWeight: '600',
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
  footerContainer: {
    paddingTop: 8,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  showAllButton: {
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
  showAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
  // Time Grid Styles
  timeGridContainer: {
    flex: 1,
  },
  timeGridContent: {
    paddingBottom: 20,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  timeGridSlot: {
    width: '32%', // 3 columns with spacing
    minHeight: 48, // Minimum 48dp touch target
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  timeGridSlotSelected: {
    backgroundColor: '#ec4899', // Brand pink background
    borderColor: '#ec4899',
  },
  timeGridSlotUnavailable: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  timeGridText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937', // Dark text for light background
    textAlign: 'center',
  },
  timeGridTextSelected: {
    color: '#ffffff', // White text for selected
    fontWeight: '600',
  },
  timeGridTextUnavailable: {
    color: '#C4C4C4', // Light gray for unavailable
  },
});

export default SchedulingWizardSlotsScreen;