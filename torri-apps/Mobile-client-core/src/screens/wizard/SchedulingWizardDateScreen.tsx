import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  });

  useEffect(() => {
    setCurrentStep(1);
    
    // Initialize services from route params if provided
    if (route.params?.services && route.params.services.length > 0) {
      setSelectedServices(route.params.services);
    }
  }, []);

  useEffect(() => {
    if (selectedServices.length > 0) {
      // Load current month's availability
      loadAvailableDates(currentMonth.year, currentMonth.month);
    }
  }, [selectedServices.length]);

  const markedDatesCalculated = useMemo(() => {
    const marked: {[key: string]: any} = {};

    availableDates.forEach((date: string) => {
      marked[date] = {
        dots: [{ color: '#ec4899' }],
        disabled: false,
      };
    });

    const today = new Date();
    const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!availableDates.includes(dateStr) && d >= today) {
        marked[dateStr] = {
          dots: [{ color: '#d1d5db' }],
          disabled: true,
          disableTouchEvent: false,
        };
      }
    }

    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#ec4899',
        selectedTextColor: 'white',
      };
    }

    return marked;
  }, [availableDates, selectedDate]);

  useEffect(() => {
    setMarkedDates(markedDatesCalculated);
  }, [markedDatesCalculated]);

  const loadAvailableDates = async (year?: number, month?: number) => {
    if (selectedServices.length === 0) return;

    setLoading(true);
    clearError();

    try {
      const serviceIds = selectedServices.map((service: Service) => service.id);
      
      // Use provided year/month or default to current month
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? (now.getMonth() + 1);

      // Update current month state FIRST
      setCurrentMonth({ year: targetYear, month: targetMonth });

      // Use optimized calendar endpoint for better performance  
      const dates = await wizardApiService.getAvailableDatesForCalendar(serviceIds, targetYear, targetMonth);
      setAvailableDates(dates);
      
    } catch (error) {
      setError('Erro ao carregar datas disponíveis. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };


  const handleDateSelect = useCallback((day: DateData) => {
    const dateString = day.dateString;

    if (!availableDates.includes(dateString)) {
      showUnavailabilityTooltip();
      return;
    }

    setSelectedDate(dateString);

    setTimeout(() => {
      if (canProceedToStep(2)) {
        goToNextStep();
        navigation.navigate('WizardProfessionals');
      }
    }, 500);
  }, [availableDates, setSelectedDate, canProceedToStep, goToNextStep, navigation]);

  const showUnavailabilityTooltip = useCallback(() => {
    Alert.alert(
      'Data Indisponível',
      'Não há horários disponíveis para os serviços escolhidos nesta data.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleMonthChange = (month: any) => {
    const year = month.year;
    const monthNumber = month.month;
    
    // Update current month state immediately for UI responsiveness
    setCurrentMonth({ year, month: monthNumber });
    
    // Clear previous month's availability data
    setAvailableDates([]);
    
    // Load availability for the new month
    loadAvailableDates(year, monthNumber);
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
              <Text style={styles.totalTimeText}>
                {formatDuration(getTotalEstimatedTime())}
              </Text>
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
              onMonthChange={handleMonthChange}
              markedDates={markedDates}
              markingType="multi-dot"
              minDate={new Date().toISOString().split('T')[0]}
              maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // 3 months ahead
              current={`${currentMonth.year}-${currentMonth.month.toString().padStart(2, '0')}-01`}
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
              removeClippedSubviews={true}
              renderArrow={(direction: 'left' | 'right') => (
                <Text style={styles.calendarArrow}>
                  {direction === 'left' ? '‹' : '›'}
                </Text>
              )}
            />
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
    marginBottom: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginVertical: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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