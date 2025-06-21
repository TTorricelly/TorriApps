import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { WizardHeader, WizardContainer } from '../../components/wizard';
import { useWizardStore } from '../../store/wizardStore';
import { wizardApiService } from '../../services/wizardApiService';
import { WizardNavigationProp, WizardStackParamList } from '../../navigation/SchedulingWizardNavigator';
import { Service } from '../../types';

type SchedulingWizardDateScreenNavigationProp = WizardNavigationProp<'WizardDate'>;
type SchedulingWizardDateScreenRouteProp = RouteProp<WizardStackParamList, 'WizardDate'>;

const SchedulingWizardDateScreen: React.FC = () => {
  const navigation = useNavigation<SchedulingWizardDateScreenNavigationProp>();
  const route = useRoute<SchedulingWizardDateScreenRouteProp>();
  
  const {
    selectedServices,
    selectedDate,
    availableDates,
    isLoading,
    error,
    setSelectedServices,
    setSelectedDate,
    setAvailableDates,
    setLoading,
    setError,
    clearError,
    setCurrentStep,
    goToNextStep,
    canProceedToStep,
  } = useWizardStore();

  const [markedDates, setMarkedDates] = useState<{[key: string]: any}>({});
  const [availabilityData, setAvailabilityData] = useState<{[key: string]: number}>({});

  useEffect(() => {
    setCurrentStep(1);
    
    // Initialize services from route params if provided
    if (route.params?.services && route.params.services.length > 0) {
      setSelectedServices(route.params.services);
    }
  }, []);

  useEffect(() => {
    if (selectedServices.length > 0) {
      loadAvailableDates();
    }
  }, [selectedServices]);

  useEffect(() => {
    updateMarkedDates();
  }, [availableDates, selectedDate]);

  const loadAvailableDates = async () => {
    if (selectedServices.length === 0) return;

    setLoading(true);
    clearError();

    try {
      const serviceIds = selectedServices.map((service: Service) => service.id);
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const dates = await wizardApiService.getAvailableDates(serviceIds, year, month);
      setAvailableDates(dates);
      
      // For now, simulate slot counts (in a real implementation, this would come from the API)
      const slotsData: {[key: string]: number} = {};
      dates.forEach((date: string) => {
        // Simulate 1-8 available slots per day
        slotsData[date] = Math.floor(Math.random() * 8) + 1;
      });
      setAvailabilityData(slotsData);
    } catch (error) {
      console.error('Error loading available dates:', error);
      setError('Erro ao carregar datas disponíveis. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const updateMarkedDates = () => {
    const marked: {[key: string]: any} = {};

    // Mark available dates with multiple dots to indicate slot count ranges
    availableDates.forEach((date: string) => {
      const slotCount = availabilityData[date] || 0;
      
      // Create dots based on slot count (1-2 dots for low, 3 dots for high availability)
      const dots = [];
      if (slotCount >= 1) dots.push({ color: '#ec4899' });
      if (slotCount >= 3) dots.push({ color: '#ec4899' });
      if (slotCount >= 6) dots.push({ color: '#ec4899' });
      
      marked[date] = {
        dots: dots,
        disabled: false,
      };
    });

    // Mark unavailable future dates with gray dots
    const today = new Date();
    const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!availableDates.includes(dateStr) && d >= today) {
        marked[dateStr] = {
          dots: [{ color: '#d1d5db' }], // Single gray dot for unavailable
          disabled: true,
          disableTouchEvent: false,
        };
      }
    }

    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#ec4899',
        selectedTextColor: 'white',
      };
    }

    setMarkedDates(marked);
  };

  const handleDateSelect = (day: DateData) => {
    const dateString = day.dateString;

    if (!availableDates.includes(dateString)) {
      showUnavailabilityTooltip();
      return;
    }

    setSelectedDate(dateString);

    // Auto-navigate to next step if possible
    setTimeout(() => {
      if (canProceedToStep(2)) {
        goToNextStep();
        navigation.navigate('WizardProfessionals');
      }
    }, 500);
  };

  const showUnavailabilityTooltip = () => {
    Alert.alert(
      'Data Indisponível',
      'Não há horários disponíveis para os serviços escolhidos nesta data.',
      [{ text: 'OK' }]
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatSelectedDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).replace('.', '');
  };

  const getTotalEstimatedTime = () => {
    return selectedServices.reduce((total: number, service: Service) => {
      return total + service.duration_minutes;
    }, 0);
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

  const renderServiceChip = ({ item: service }: { item: Service }) => (
    <View style={styles.serviceChip}>
      <Text style={styles.serviceChipText}>{service.name}</Text>
      <Text style={styles.serviceChipDuration}>{service.duration_minutes}min</Text>
    </View>
  );

  const renderCustomDay = (day: any) => {
    const dateString = day.dateString;
    const isAvailable = availableDates.includes(dateString);
    const isSelected = selectedDate === dateString;
    const slotCount = availabilityData[dateString] || 0;
    const isToday = dateString === new Date().toISOString().split('T')[0];
    
    // Check if this is a future date that should show availability indicators
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    const dayDate = new Date(dateString + 'T00:00:00');
    const isFutureDate = dayDate >= today;
    
    return (
      <View style={styles.dayContainer}>
        <View style={[
          styles.dayContent,
          isSelected && styles.selectedDay,
          isToday && !isSelected && styles.todayDay
        ]}>
          <Text style={[
            styles.dayText,
            isSelected && styles.selectedDayText,
            isToday && !isSelected && styles.todayDayText,
          ]}>
            {day.day}
          </Text>
          
          {/* Show indicators only for future dates */}
          {isFutureDate && isAvailable && (
            <View style={[styles.availabilityIndicator, isSelected && styles.selectedIndicator]}>
              <Text style={[styles.slotCountText, isSelected && styles.selectedSlotText]}>
                {slotCount}
              </Text>
            </View>
          )}
          
          {isFutureDate && !isAvailable && (
            <View style={styles.lockContainer}>
              <Lock size={6} color="#9ca3af" />
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#ec4899" />
      <Text style={styles.loadingText}>Carregando datas disponíveis...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Nenhum serviço selecionado</Text>
      <Text style={styles.emptyText}>
        Volte para a tela de serviços e selecione os serviços que deseja agendar.
      </Text>
    </View>
  );

  const renderNoAvailabilityState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Nenhuma data disponível</Text>
      <Text style={styles.emptyText}>
        Não há horários disponíveis para os serviços selecionados neste mês.
      </Text>
    </View>
  );

  return (
    <WizardContainer>
      <WizardHeader
        currentStep={1}
        totalSteps={4}
        title="Selecionar data"
        onBack={handleBack}
      />

      {selectedServices.length === 0 ? (
        renderEmptyState()
      ) : isLoading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : (
        <View style={styles.content}>
          {/* Services Summary */}
          <View style={styles.servicesSummary}>
            <View style={styles.servicesSummaryHeader}>
              <Text style={styles.servicesSummaryTitle}>Serviços selecionados</Text>
              <View style={styles.summaryRight}>
                {selectedDate && (
                  <Text style={styles.selectedDateChip}>
                    {formatSelectedDate(selectedDate)}
                  </Text>
                )}
                <Text style={styles.totalTimeText}>
                  {formatDuration(getTotalEstimatedTime())}
                </Text>
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
            />
          </View>

          {/* Calendar */}
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={markedDates}
              markingType="multi-dot"
              minDate={new Date().toISOString().split('T')[0]}
              maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // 3 months ahead
              theme={{
                selectedDayBackgroundColor: '#ec4899',
                selectedDayTextColor: 'white',
                todayTextColor: '#ec4899',
                arrowColor: '#ec4899',
                dotColor: '#ec4899',
                selectedDotColor: 'white',
                disabledArrowColor: '#d9d9d9',
                monthTextColor: '#1f2937',
                indicatorColor: '#ec4899',
                textDayFontFamily: 'System',
                textMonthFontFamily: 'System',
                textDayHeaderFontFamily: 'System',
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
              enableSwipeMonths={true}
              hideExtraDays={true}
              disableMonthChange={false}
              firstDay={0} // Sunday = 0, Monday = 1
              hideDayNames={false}
              showWeekNumbers={false}
              disableArrowLeft={false}
              disableArrowRight={false}
              disableAllTouchEventsForDisabledDays={true}
              renderArrow={(direction: 'left' | 'right') => (
                <Text style={styles.calendarArrow}>
                  {direction === 'left' ? '‹' : '›'}
                </Text>
              )}
            />
          </View>

          {/* Calendar Legend */}
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Poucos horários</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDot} />
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Médios horários</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDot} />
              <View style={styles.legendDot} />
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Muitos horários</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.grayDot]} />
              <Text style={styles.legendText}>Indisponível</Text>
            </View>
          </View>

          {/* No Availability Message */}
          {!isLoading && availableDates.length === 0 && (
            renderNoAvailabilityState()
          )}
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
  servicesSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
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
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateChip: {
    backgroundColor: '#ec4899',
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    textTransform: 'uppercase',
  },
  totalTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
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
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 24,
  },
  calendarArrow: {
    fontSize: 24,
    color: '#ec4899',
    fontWeight: 'bold',
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
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ec4899',
    marginRight: 2,
  },
  grayDot: {
    backgroundColor: '#d1d5db',
  },
  legendText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
  },
});

export default SchedulingWizardDateScreen;