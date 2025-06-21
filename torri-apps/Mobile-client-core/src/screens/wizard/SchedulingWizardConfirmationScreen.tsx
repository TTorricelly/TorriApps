import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { WizardHeader, WizardContainer } from '../../components/wizard';
import { useWizardStore } from '../../store/wizardStore';
import { useAuthStore } from '../../store/authStore';
import { wizardApiService } from '../../services/wizardApiService';
import { WizardNavigationProp } from '../../navigation/SchedulingWizardNavigator';
import { Service, Professional } from '../../types';

type SchedulingWizardConfirmationScreenNavigationProp = WizardNavigationProp<'WizardConfirmation'>;

const SchedulingWizardConfirmationScreen: React.FC = () => {
  const navigation = useNavigation<SchedulingWizardConfirmationScreenNavigationProp>();
  const [isBooking, setIsBooking] = useState(false);
  
  const {
    selectedServices,
    selectedDate,
    professionalsRequested,
    selectedProfessionals,
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
        null // notes - could be added as an optional field later
      );

      const result = await wizardApiService.createMultiServiceBooking(bookingRequest);

      Alert.alert(
        'Agendamento Confirmado!',
        `Seus serviços foram agendados com sucesso.\n\nNúmero do agendamento: ${result.appointment_group?.id || 'N/A'}`,
        [
          {
            text: 'OK',
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
      console.error('Error creating booking:', error);
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
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const formatPrice = (price: number) => {
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const renderServicesSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Serviços Selecionados</Text>
      {selectedServices.map((service: Service, index: number) => (
        <View key={index} style={styles.serviceItem}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceDetails}>
              {service.duration_minutes} min • {formatPrice(parseFloat(service.price))}
            </Text>
            {service.description && (
              <Text style={styles.serviceDescription}>{service.description}</Text>
            )}
          </View>
        </View>
      ))}
      
      <View style={styles.servicesTotal}>
        <Text style={styles.servicesTotalText}>
          Total: {selectedServices.length} serviço{selectedServices.length > 1 ? 's' : ''} • {formatPrice(selectedServices.reduce((sum: number, service: Service) => sum + parseFloat(service.price), 0))}
        </Text>
      </View>
    </View>
  );

  const renderDateAndTime = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Data e Horário</Text>
      <View style={styles.dateTimeCard}>
        <View style={styles.dateTimeRow}>
          <Text style={styles.dateTimeLabel}>📅 Data:</Text>
          <Text style={styles.dateTimeValue}>{formatDate(selectedDate)}</Text>
        </View>
        <View style={styles.dateTimeRow}>
          <Text style={styles.dateTimeLabel}>🕐 Horário:</Text>
          <Text style={styles.dateTimeValue}>
            {formatTime(selectedSlot?.start_time || '')} - {formatTime(selectedSlot?.end_time || '')}
          </Text>
        </View>
        <View style={styles.dateTimeRow}>
          <Text style={styles.dateTimeLabel}>⏱️ Duração:</Text>
          <Text style={styles.dateTimeValue}>
            {selectedSlot?.total_duration_minutes} minutos
          </Text>
        </View>
      </View>
    </View>
  );

  const renderProfessionals = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        Profissional{professionalsRequested > 1 ? 'is' : ''} Selecionado{professionalsRequested > 1 ? 's' : ''}
      </Text>
      {selectedProfessionals.map((professional: Professional | null, index: number) => (
        professional && (
          <View key={professional.id} style={styles.professionalItem}>
            <View style={styles.professionalAvatar}>
              <Text style={styles.professionalAvatarText}>
                {(professional.full_name || professional.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.professionalInfo}>
              <Text style={styles.professionalName}>
                {professional.full_name || professional.email}
              </Text>
              <Text style={styles.professionalEmail}>{professional.email}</Text>
            </View>
          </View>
        )
      ))}
      
      {professionalsRequested > 1 && (
        <View style={styles.parallelInfo}>
          <Text style={styles.parallelInfoText}>
            ⚡ Execução paralela com {professionalsRequested} profissionais
          </Text>
        </View>
      )}
    </View>
  );

  const renderExecutionDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Detalhes da Execução</Text>
      <View style={styles.executionCard}>
        <View style={styles.executionRow}>
          <Text style={styles.executionLabel}>Tipo de execução:</Text>
          <Text style={styles.executionValue}>
            {selectedSlot?.execution_type === 'parallel' ? 'Paralela' : 'Sequencial'}
          </Text>
        </View>
        {selectedSlot?.execution_type === 'parallel' && (
          <Text style={styles.executionNote}>
            Os serviços serão realizados simultaneamente por profissionais diferentes.
          </Text>
        )}
        {selectedSlot?.execution_type === 'sequential' && (
          <Text style={styles.executionNote}>
            Os serviços serão realizados um após o outro pelo mesmo profissional.
          </Text>
        )}
      </View>
    </View>
  );

  const renderPricingSummary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Resumo do Pagamento</Text>
      <View style={styles.pricingCard}>
        {selectedServices.map((service: Service, index: number) => (
          <View key={index} style={styles.pricingRow}>
            <Text style={styles.pricingServiceName}>{service.name}</Text>
            <Text style={styles.pricingServicePrice}>{formatPrice(parseFloat(service.price))}</Text>
          </View>
        ))}
        
        <View style={styles.pricingDivider} />
        
        <View style={styles.pricingTotalRow}>
          <Text style={styles.pricingTotalLabel}>Total</Text>
          <Text style={styles.pricingTotalPrice}>
            {formatPrice(selectedSlot?.total_price || 0)}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderImportantNotes = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Informações Importantes</Text>
      <View style={styles.notesCard}>
        <Text style={styles.noteItem}>
          • Chegue com 10 minutos de antecedência
        </Text>
        <Text style={styles.noteItem}>
          • Cancelamentos devem ser feitos com 24h de antecedência
        </Text>
        <Text style={styles.noteItem}>
          • Em caso de atraso superior a 15 minutos, o horário poderá ser reagendado
        </Text>
        <Text style={styles.noteItem}>
          • Você receberá uma confirmação por e-mail após o agendamento
        </Text>
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
        title="Confirmar agendamento"
        onBack={handleBack}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderServicesSummary()}
        {renderDateAndTime()}
        {renderProfessionals()}
        {renderExecutionDetails()}
        {renderPricingSummary()}
        {renderImportantNotes()}
      </ScrollView>

      {/* Confirm Button */}
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
            <Text style={styles.confirmButtonText}>
              Confirmar Agendamento • {formatPrice(selectedSlot.total_price)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </WizardContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  serviceItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  serviceDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
  },
  servicesTotal: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  servicesTotalText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  dateTimeCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTimeLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  dateTimeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  professionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  professionalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  professionalAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  professionalEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  parallelInfo: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  parallelInfoText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
  },
  executionCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  executionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  executionLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  executionValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  executionNote: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  pricingCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricingServiceName: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  pricingServicePrice: {
    fontSize: 14,
    color: '#6b7280',
  },
  pricingDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  pricingTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  pricingTotalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ec4899',
  },
  notesCard: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  noteItem: {
    fontSize: 14,
    color: '#0369a1',
    lineHeight: 20,
    marginBottom: 8,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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