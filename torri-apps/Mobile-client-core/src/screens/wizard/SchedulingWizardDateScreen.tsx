import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
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

      const dates = await wizardApiService.getAvailableDates(serviceIds);
      setAvailableDates(dates);
    } catch (error) {
      console.error('Error loading available dates:', error);
      setError('Erro ao carregar datas disponíveis. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const updateMarkedDates = () => {
    const marked: {[key: string]: any} = {};

    // Mark available dates
    availableDates.forEach((date: string) => {
      marked[date] = {
        marked: true,
        dotColor: '#ec4899',
        disabled: false,
      };
    });

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
      showUnavailabilityTooltip(dateString);
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

  const showUnavailabilityTooltip = (date: string) => {
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
            <Text style={styles.servicesSummaryTitle}>Serviços selecionados:</Text>
            {selectedServices.map((service: Service, index: number) => (
              <Text key={index} style={styles.serviceItem}>
                • {service.name} ({service.duration_minutes} min)
              </Text>
            ))}
          </View>

          {/* Calendar */}
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDateSelect}
              markedDates={markedDates}
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

          {/* Selected Date Display */}
          {selectedDate && (
            <View style={styles.selectedDateContainer}>
              <Text style={styles.selectedDateLabel}>Data selecionada:</Text>
              <Text style={styles.selectedDateText}>
                {formatDate(selectedDate)}
              </Text>
            </View>
          )}

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
  servicesSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  serviceItem: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
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
  selectedDateContainer: {
    backgroundColor: '#fdf2f8',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f3e8ff',
  },
  selectedDateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7c3aed',
    marginBottom: 4,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textTransform: 'capitalize',
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
});

export default SchedulingWizardDateScreen;