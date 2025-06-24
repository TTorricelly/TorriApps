import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { WizardHeader, WizardContainer } from '../../components/wizard';
import { useWizardStore } from '../../store/wizardStore';
import useAuthStore from '../../store/authStore';
import useServicesStore from '../../store/servicesStore';
import { wizardApiService } from '../../services/wizardApiService';
import { WizardNavigationProp } from '../../navigation/SchedulingWizardNavigator';
import { Service } from '../../types';

type SchedulingWizardConfirmationScreenNavigationProp = WizardNavigationProp<'WizardConfirmation'>;

const SchedulingWizardConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<SchedulingWizardConfirmationScreenNavigationProp>();
  const [isBooking, setIsBooking] = useState(false);
  const [clientNotes, setClientNotes] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState<any>(null);
  
  const {
    selectedServices,
    selectedDate,
    selectedSlot,
    setCurrentStep,
    goToPreviousStep,
    resetWizard,
  } = useWizardStore();
  
  const { user } = useAuthStore();
  const { clearServices } = useServicesStore();

  React.useEffect(() => {
    setCurrentStep(4);
  }, []);

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
  };

  const handleSuccessComplete = () => {
    // Reset navigation stack and go directly to Agendamentos
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'BottomTabs',
            state: {
              routes: [
                { name: 'Início' },
                { name: 'Serviços' },
                { name: 'Agendamentos' },
                { name: 'Perfil' },
              ],
              index: 2, // Agendamentos tab index
            },
          },
        ],
      })
    );
  };


  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      Alert.alert('Erro', 'Nenhum horário selecionado.');
      return;
    }

    setIsBooking(true);

    try {
      if (!user?.id) {
        Alert.alert('Erro', 'Usuário não autenticado.');
        return;
      }
      
      const bookingRequest = wizardApiService.buildBookingRequest(
        user.id,
        selectedDate,
        selectedSlot,
        clientNotes.trim() || null // Client notes
      );

      await wizardApiService.createMultiServiceBooking(bookingRequest);

      // Store booking data before clearing wizard state
      setConfirmedBookingData({
        selectedServices,
        selectedDate,
        selectedSlot,
      });
      
      // Clear all wizard state immediately after successful booking
      resetWizard();
      
      // Clear the original service cart/checkout
      clearServices();
      
      // Clear local state immediately
      setClientNotes('');
      
      // Show modern success screen
      setBookingConfirmed(true);
    } catch (error) {
      Alert.alert(
        'Erro no Agendamento',
        'Não foi possível confirmar o agendamento. Tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsBooking(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  // Compact date/time card
  const renderDateTimeCard = () => (
    <View style={styles.compactCard}>
      <View style={styles.compactRow}>
        <View style={styles.compactIconContainer}>
          <Text style={styles.compactIcon}>📅</Text>
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactDate}>{formatDate(selectedDate)}</Text>
          <View style={styles.compactTimeRow}>
            <Text style={styles.compactTime}>
              {formatTime(selectedSlot?.start_time || '')} - {formatTime(selectedSlot?.end_time || '')}
            </Text>
            <Text style={styles.compactDuration}>
              {formatDuration(selectedSlot?.total_duration_minutes || 0)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Compact services card
  const renderServiceAssignments = () => (
    <View style={styles.compactCard}>
      <View style={styles.compactServiceHeader}>
        <View style={styles.compactIconContainer}>
          <Text style={styles.compactIcon}>💼</Text>
        </View>
        <Text style={styles.compactCardTitle}>Serviços</Text>
        {selectedSlot?.execution_type === 'parallel' && (
          <View style={styles.compactParallelBadge}>
            <Text style={styles.compactParallelText}>⚡</Text>
          </View>
        )}
      </View>
      
      <View style={styles.servicesContent}>
        {selectedSlot?.services?.map((serviceInSlot: any, index: number) => (
          <View key={index} style={styles.serviceAssignmentRow}>
            <View style={styles.serviceMainInfo}>
              <Text style={styles.serviceNameModern}>{serviceInSlot.service_name}</Text>
              <View style={styles.serviceMetaRow}>
                <Text style={styles.serviceDuration}>
                  {formatDuration(serviceInSlot.duration_minutes)}
                </Text>
                <Text style={styles.servicePrice}>
                  {formatPrice(parseFloat(serviceInSlot.price))}
                </Text>
              </View>
            </View>
            
            <View style={styles.professionalAssignment}>
              <View style={styles.professionalAvatarSmall}>
                <Text style={styles.professionalAvatarTextSmall}>
                  {(serviceInSlot.professional_name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.professionalNameSmall}>
                {serviceInSlot.professional_name}
              </Text>
            </View>
          </View>
        )) || (
          // Fallback for when service assignments aren't available
          selectedServices.map((service: Service, index: number) => (
            <View key={index} style={styles.serviceAssignmentRow}>
              <View style={styles.serviceMainInfo}>
                <Text style={styles.serviceNameModern}>{service.name}</Text>
                <View style={styles.serviceMetaRow}>
                  <Text style={styles.serviceDuration}>
                    {formatDuration(service.duration_minutes)}
                  </Text>
                  <Text style={styles.servicePrice}>
                    {formatPrice(parseFloat(service.price))}
                  </Text>
                </View>
              </View>
              
              <View style={styles.professionalAssignment}>
                <Text style={styles.professionalNameSmall}>
                  Atribuição automática
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );


  // Compact client notes section
  const renderClientNotes = () => (
    <View style={styles.compactCard}>
      <View style={styles.compactServiceHeader}>
        <View style={styles.compactIconContainer}>
          <Text style={styles.compactIcon}>📝</Text>
        </View>
        <Text style={styles.compactCardTitle}>Observações</Text>
        <Text style={styles.compactOptionalText}>(opcional)</Text>
      </View>
      
      <View style={styles.compactNotesContent}>
        <TextInput
          style={styles.compactNotesInput}
          multiline
          numberOfLines={3}
          placeholder="Alergias, preferências ou observações especiais..."
          placeholderTextColor="#9ca3af"
          value={clientNotes}
          onChangeText={setClientNotes}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.compactCharacterCount}>
          {clientNotes.length}/500
        </Text>
      </View>
    </View>
  );

  // Enhanced important notes with better visual hierarchy
  const renderImportantNotes = () => (
    <View style={styles.notesCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.cardIcon}>ℹ️</Text>
        </View>
        <Text style={styles.cardTitle}>Informações Importantes</Text>
      </View>
      
      <View style={styles.notesContent}>
        <View style={styles.noteRow}>
          <Text style={styles.noteIcon}>🕐</Text>
          <Text style={styles.noteText}>Chegue com 10 minutos de antecedência</Text>
        </View>
        
        <View style={styles.noteRow}>
          <Text style={styles.noteIcon}>📞</Text>
          <Text style={styles.noteText}>Cancelamentos com 24h de antecedência</Text>
        </View>
        
        <View style={styles.noteRow}>
          <Text style={styles.noteIcon}>⏰</Text>
          <Text style={styles.noteText}>Atrasos de 15+ min podem ser reagendados</Text>
        </View>
      </View>
    </View>
  );

  // Modern success screen (like Uber/Airbnb)
  const renderSuccessScreen = () => (
    <View style={styles.successContainer}>
      <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
        {/* Success Icon & Title */}
        <View style={styles.successHeader}>
          <View style={styles.successIconContainer}>
            <Text style={styles.successIcon}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Agendamento Confirmado!</Text>
        </View>

        {/* Appointment Summary Card */}
        <View style={styles.successSummaryCard}>
          <View style={styles.successSummaryContent}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>📅 Data</Text>
              <Text style={styles.successValue}>{formatDate(confirmedBookingData?.selectedDate || '')}</Text>
            </View>
            
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>🕐 Horário</Text>
              <Text style={styles.successValue}>
                {formatTime(confirmedBookingData?.selectedSlot?.start_time || '')} - {formatTime(confirmedBookingData?.selectedSlot?.end_time || '')}
              </Text>
            </View>
            
            <View style={styles.successServicesRow}>
              <Text style={styles.successLabel}>💼 Serviços</Text>
              <View style={styles.successServicesChips}>
                {confirmedBookingData?.selectedServices?.map((service: any, index: number) => (
                  <View key={index} style={styles.successServiceChip}>
                    <Text style={styles.successServiceChipText}>{service.name}</Text>
                  </View>
                )) || []}
              </View>
            </View>
            
            <View style={styles.successDivider} />
            
            <View style={styles.successRow}>
              <Text style={styles.successTotalLabel}>Total</Text>
              <Text style={styles.successTotalValue}>
                {formatPrice(confirmedBookingData?.selectedSlot?.total_price || 0)}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Action Button */}
      <View style={styles.successFooter}>
        <TouchableOpacity
          style={styles.primarySuccessButton}
          onPress={handleSuccessComplete}
        >
          <Text style={styles.primarySuccessButtonText}>Concluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!selectedSlot && !bookingConfirmed) {
    return (
      <WizardContainer>
        <WizardHeader
          currentStep={4}
          totalSteps={4}
          title="Confirmação"
          onBack={handleBack}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Nenhum horário selecionado</Text>
        </View>
      </WizardContainer>
    );
  }

  // Show success screen if booking is confirmed
  if (bookingConfirmed && confirmedBookingData) {
    return (
      <WizardContainer>
        {renderSuccessScreen()}
      </WizardContainer>
    );
  }

  return (
    <WizardContainer>
      <WizardHeader
        currentStep={4}
        totalSteps={4}
        title="Confirmar Agendamento"
        onBack={handleBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderDateTimeCard()}
        {renderServiceAssignments()}
        {renderClientNotes()}
        {renderImportantNotes()}
        
        {/* Bottom spacing for better scroll experience */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Enhanced Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            isBooking && styles.disabledButton,
          ]}
          onPress={handleConfirmBooking}
          disabled={isBooking}
        >
          {isBooking ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.confirmButtonText}>Confirmando...</Text>
            </View>
          ) : (
            <View style={styles.confirmButtonContent}>
              <Text style={styles.confirmButtonText}>
                Confirmar Agendamento
              </Text>
              <Text style={styles.confirmButtonPrice}>
                {formatPrice(selectedSlot.total_price)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </WizardContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Modern card styles
  modernCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  
  notesCard: {
    backgroundColor: '#f0f9ff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  cardIcon: {
    fontSize: 16,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  
  parallelBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  
  parallelBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e',
  },
  
  // Date time content
  dateTimeContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  dateTimeMainInfo: {
    gap: 12,
  },
  
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    textTransform: 'capitalize',
  },
  
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  timeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ec4899',
  },
  
  durationBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  
  // Service assignments
  servicesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  
  serviceAssignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  
  serviceMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  
  serviceNameModern: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  
  serviceMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  
  serviceDuration: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  servicePrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  
  professionalAssignment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  professionalAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  professionalAvatarTextSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  
  professionalNameSmall: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    maxWidth: 100,
  },
  
  // Total section styles
  totalSection: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ec4899',
  },
  
  // Client notes styles
  optionalText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  
  notesInputContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  notesInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    minHeight: 100,
    marginBottom: 8,
  },
  
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
  },
  
  // Notes styles
  notesContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  
  noteIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  
  noteText: {
    fontSize: 14,
    color: '#0369a1',
    lineHeight: 20,
    flex: 1,
  },
  
  // Footer and button
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  
  confirmButton: {
    backgroundColor: '#ec4899',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#ec4899',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  disabledButton: {
    backgroundColor: '#e5e7eb',
    shadowOpacity: 0,
  },
  
  confirmButtonContent: {
    alignItems: 'center',
    gap: 4,
  },
  
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  confirmButtonPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  
  bottomSpacing: {
    height: 20,
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
  },
  
  // Modern success screen styles (Uber/Airbnb inspired)
  successContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  successContent: {
    padding: 24,
    paddingBottom: 100, // Space for buttons
  },
  
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 40,
  },
  
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  
  successIcon: {
    fontSize: 40,
  },
  
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  successSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  successSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  
  successSummaryHeader: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  
  successSummaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  
  successSummaryContent: {
    padding: 20,
  },
  
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  successLabel: {
    fontSize: 16,
    color: '#6b7280',
    flex: 1,
  },
  
  successValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'right',
    flex: 2,
  },
  
  successServicesRow: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  
  successServicesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  
  successServiceChip: {
    backgroundColor: '#fdf2f8',
    borderColor: '#ec4899',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  
  successServiceChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ec4899',
  },
  
  successDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
    marginBottom: 16,
  },
  
  successTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  
  successTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
  },
  
  successFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  
  primarySuccessButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  primarySuccessButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  secondarySuccessButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  
  secondarySuccessButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  
  // Compact styles for better space usage
  compactCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6, // Reduced from 8
    borderRadius: 12, // Reduced from 16
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03, // Reduced shadow
    shadowRadius: 4,
    elevation: 2,
  },
  
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16, // Reduced from 20
  },
  
  compactServiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8, // Reduced padding
  },
  
  compactIconContainer: {
    width: 24, // Reduced from 32
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  compactIcon: {
    fontSize: 14, // Reduced from 16
  },
  
  compactCardTitle: {
    fontSize: 16, // Reduced from 18
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  
  compactContent: {
    flex: 1,
  },
  
  compactDate: {
    fontSize: 15, // Reduced
    fontWeight: '500',
    color: '#1f2937',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  
  compactTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  compactTime: {
    fontSize: 18, // Reduced from 24
    fontWeight: '700',
    color: '#ec4899',
  },
  
  compactDuration: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  
  compactParallelBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  
  compactParallelText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#92400e',
  },
  
  compactOptionalText: {
    fontSize: 12, // Reduced
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  
  compactNotesContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  
  compactNotesInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8, // Reduced
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14, // Reduced
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    minHeight: 70, // Reduced from 100
    marginBottom: 6,
  },
  
  compactCharacterCount: {
    fontSize: 11, // Reduced
    color: '#9ca3af',
    textAlign: 'right',
  },
});

export default SchedulingWizardConfirmationScreen;