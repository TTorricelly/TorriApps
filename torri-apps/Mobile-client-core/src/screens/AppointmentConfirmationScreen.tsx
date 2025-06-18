import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Scissors, Calendar, User, MapPin } from 'lucide-react-native';
import { AppointmentConfirmationProps } from '../types';
import { createAppointment } from '../services/appointmentService';
import useAuthStore from '../store/authStore';

// Helper function to format date for display
const formatDateForDisplay = (date: any): string => {
  if (!date) return "";
  const months: Record<string, string> = {
    Mai: "Maio", Jun: "Junho", Jul: "Julho", Ago: "Agosto",
    Set: "Setembro", Out: "Outubro", Nov: "Novembro", Dez: "Dezembro",
  };
  return `${date.day}, ${date.date} de ${months[date.month] || date.month}`;
};

// Helper function to format price
const formatPrice = (priceStr: string | undefined | null) => {
  if (priceStr === undefined || priceStr === null) return 'R$ -';
  const priceNum = parseFloat(priceStr);
  if (isNaN(priceNum)) return 'R$ -';
  return `R$ ${priceNum.toFixed(2).replace('.', ',')}`;
};

const AppointmentConfirmationScreen: React.FC<AppointmentConfirmationProps> = ({
  appointmentState,
  setObservations,
  salonInfo,
  onNavigate,
  onScrollToTop,
  scrollRef,
}) => {
  const { selectedService, selectedDate, selectedProfessional, selectedTime, observations } = appointmentState;
  const [isConfirming, setIsConfirming] = useState(false);
  const { user } = useAuthStore();

  const handleConfirmAppointment = async () => {
    // Validate all required data is present
    if (!selectedService || !selectedDate || !selectedProfessional || !selectedTime || !user?.id) {
      Alert.alert(
        'Erro de Validação',
        'Alguns dados necessários estão faltando. Por favor, verifique suas seleções.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsConfirming(true);

    try {
      const appointmentData = {
        client_id: user.id, // Current authenticated user
        professional_id: selectedProfessional.id,
        service_id: selectedService.id,
        appointment_date: selectedDate.fullDate, // YYYY-MM-DD format
        start_time: selectedTime, // HH:MM format
        notes_by_client: observations.trim() || null,
      };

      console.log('Creating appointment with data:', appointmentData);

      const createdAppointment = await createAppointment(appointmentData);
      
      console.log('Appointment created successfully:', createdAppointment);

      // Navigate to success screen
      onNavigate('orders');
      if (onScrollToTop && scrollRef) {
        setTimeout(() => onScrollToTop(scrollRef), 0);
      }
    } catch (error: any) {
      console.error('Failed to create appointment:', error);
      Alert.alert(
        'Erro ao Criar Agendamento',
        error.message || 'Não foi possível criar o agendamento. Tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Header - Extends to top of screen */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => {
              onNavigate('scheduling');
              if (onScrollToTop && scrollRef) {
                setTimeout(() => onScrollToTop(scrollRef), 0);
              }
            }} 
            style={{ marginRight: 16 }}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>
            Confirmar Agendamento
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView ref={scrollRef} style={{ flex: 1, padding: 16, paddingBottom: 100 }}>
          {/* Appointment Details */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#ec4899', marginBottom: 24 }}>
              Detalhes do Agendamento
            </Text>

            <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 }}>
              {/* Service */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                <Scissors size={24} color="#6b7280" style={{ marginRight: 16, marginTop: 4 }} />
                <View>
                  <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '500' }}>Serviço:</Text>
                  <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '600' }}>
                    {selectedService?.name}
                  </Text>
                </View>
              </View>

              {/* Date and Time */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                <Calendar size={24} color="#6b7280" style={{ marginRight: 16, marginTop: 4 }} />
                <View>
                  <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '500' }}>Data e Hora:</Text>
                  <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '600' }}>
                    {selectedDate && selectedTime && `${formatDateForDisplay(selectedDate)} às ${selectedTime}`}
                  </Text>
                </View>
              </View>

              {/* Professional */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                <User size={24} color="#6b7280" style={{ marginRight: 16, marginTop: 4 }} />
                <View>
                  <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '500' }}>Profissional:</Text>
                  <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '600' }}>
                    {selectedProfessional?.name}
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <MapPin size={24} color="#6b7280" style={{ marginRight: 16, marginTop: 4 }} />
                <View>
                  <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '500' }}>Local:</Text>
                  <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '600' }}>
                    {salonInfo.name}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280' }}>
                    {salonInfo.address}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Total Value */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            paddingVertical: 12, 
            borderTopWidth: 1, 
            borderTopColor: '#e5e7eb',
            marginBottom: 24
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937' }}>Valor Total:</Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ec4899' }}>
              {formatPrice(selectedService?.price)}
            </Text>
          </View>

          {/* Observations */}
          <View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 12 }}>
              Observações (opcional)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#d1d5db',
                borderRadius: 12,
                padding: 12,
                height: 80,
                textAlignVertical: 'top'
              }}
              multiline
              placeholder="Ex: Tenho alergia a amônia, prefiro produtos sem cheiro..."
              value={observations}
              onChangeText={setObservations}
            />
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <View style={{ padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
          <TouchableOpacity
            style={{
              backgroundColor: isConfirming ? '#d1d5db' : '#ec4899',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
            onPress={handleConfirmAppointment}
            disabled={isConfirming}
          >
            {isConfirming && (
              <ActivityIndicator 
                size="small" 
                color="white" 
                style={{ marginRight: 8 }} 
              />
            )}
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              {isConfirming ? 'Confirmando...' : 'Confirmar Agendamento'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default AppointmentConfirmationScreen;