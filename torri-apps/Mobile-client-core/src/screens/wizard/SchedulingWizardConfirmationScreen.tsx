import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WizardHeader, WizardContainer } from '../../components/wizard';
import { useWizardStore } from '../../store/wizardStore';
import useAuthStore from '../../store/authStore';
import { wizardApiService } from '../../services/wizardApiService';
import { WizardNavigationProp } from '../../navigation/SchedulingWizardNavigator';
import { Service } from '../../types';

type SchedulingWizardConfirmationScreenNavigationProp = WizardNavigationProp<'WizardConfirmation'>;

const SchedulingWizardConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<SchedulingWizardConfirmationScreenNavigationProp>();
  const [isBooking, setIsBooking] = useState(false);
  const [clientNotes, setClientNotes] = useState('');
  
  const {
    selectedServices,
    selectedDate,
    selectedSlot,
    setCurrentStep,
    goToPreviousStep,
    resetWizard,
  } = useWizardStore();
  
  const { user } = useAuthStore();

  React.useEffect(() => {
    setCurrentStep(4);
  }, []);

  const handleBack = () => {
    goToPreviousStep();
    navigation.goBack();
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

      const result = await wizardApiService.createMultiServiceBooking(bookingRequest);

      Alert.alert(
        'Agendamento Confirmado! 🎉',
        `Seus serviços foram agendados com sucesso!\n\nNúmero do agendamento: ${result.appointment_group?.id || 'N/A'}\n\nVocê receberá uma confirmação por e-mail em breve.`,
        [
          {
            text: 'Perfeito!',
            onPress: () => {
              resetWizard();
              navigation.reset({
                index: 0,
                routes: [{ name: 'WizardDate' }],
              });
              // Navigate to main app or appointments screen
              navigation.getParent()?.goBack();
            },
          },
        ]
      );
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

  // Modern card with gradient and better spacing
  const renderDateTimeCard = () => (
    <View style={styles.modernCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.cardIcon}>📅</Text>
        </View>
        <Text style={styles.cardTitle}>Data e Horário</Text>
      </View>
      
      <View style={styles.dateTimeContent}>
        <View style={styles.dateTimeMainInfo}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {formatTime(selectedSlot?.start_time || '')} - {formatTime(selectedSlot?.end_time || '')}
            </Text>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {formatDuration(selectedSlot?.total_duration_minutes || 0)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  // Enhanced service assignments with professional mapping
  const renderServiceAssignments = () => (
    <View style={styles.modernCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.cardIcon}>💼</Text>
        </View>
        <Text style={styles.cardTitle}>Serviços</Text>
        {selectedSlot?.execution_type === 'parallel' && (
          <View style={styles.parallelBadge}>
            <Text style={styles.parallelBadgeText}>⚡ Paralelo</Text>
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
      
      {/* Total Section */}
      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>
            {formatPrice(selectedSlot?.total_price || 0)}
          </Text>
        </View>
      </View>
    </View>
  );


  // Client notes input section
  const renderClientNotes = () => (
    <View style={styles.modernCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Text style={styles.cardIcon}>📝</Text>
        </View>
        <Text style={styles.cardTitle}>Observações</Text>
        <Text style={styles.optionalText}>(opcional)</Text>
      </View>
      
      <View style={styles.notesInputContent}>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={4}
          placeholder="Informe alergias, preferências ou observações especiais..."
          placeholderTextColor="#9ca3af"
          value={clientNotes}
          onChangeText={setClientNotes}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.characterCount}>
          {clientNotes.length}/500 caracteres
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
        
        <View style={styles.noteRow}>
          <Text style={styles.noteIcon}>📧</Text>
          <Text style={styles.noteText}>Confirmação será enviada por e-mail</Text>
        </View>
      </View>
    </View>
  );

  if (!selectedSlot) {
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
});

export default SchedulingWizardConfirmationScreen;