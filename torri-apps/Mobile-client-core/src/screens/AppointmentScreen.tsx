import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { AppointmentScreenProps } from '../types';
import { isToday, isPastDate } from '../utils/dateUtils';

const AppointmentScreen: React.FC<AppointmentScreenProps> = ({
  appointmentState,
  setSelectedDate,
  setSelectedProfessional,
  setSelectedTime,
  availableDates,
  professionals,
  availableTimes,
  onNavigate,
  onScrollToTop,
  scrollRef,
  isLoadingProfessionals = false,
  professionalsError = null,
  onRetryProfessionals,
  isLoadingTimeSlots = false,
  timeSlotsError = null,
  onRetryTimeSlots,
}) => {
  const { selectedDate, selectedProfessional, selectedTime } = appointmentState;

  return (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Header - Extends to top of screen */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => {
              onNavigate('service-details');
              if (onScrollToTop && scrollRef) {
                setTimeout(() => onScrollToTop(scrollRef), 0);
              }
            }} 
            style={{ marginRight: 16 }}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
            Agendamento
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView ref={scrollRef} style={{ flex: 1, paddingBottom: 100 }}>
          {/* Date Selection */}
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 16 }}>
              Selecione o dia do agendamento
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableDates.map((date, index) => {
                const isSelected = selectedDate?.fullDate === date.fullDate;
                const isPast = isPastDate(date);
                const isTodayDate = isToday(date);

                return (
                  <TouchableOpacity
                    key={index}
                    style={{
                      borderWidth: 2,
                      borderColor: isSelected ? '#ec4899' : isPast ? '#d1d5db' : isTodayDate ? '#3b82f6' : '#e5e7eb',
                      backgroundColor: isSelected ? '#fdf2f8' : isPast ? '#f9fafb' : isTodayDate ? '#eff6ff' : 'white',
                      borderRadius: 12,
                      padding: 12,
                      marginRight: 12,
                      minWidth: 70,
                      alignItems: 'center',
                      opacity: isPast ? 0.5 : 1
                    }}
                    onPress={() => !isPast && setSelectedDate(date)}
                    disabled={isPast}
                  >
                    <Text style={{ 
                      fontSize: 12, 
                      color: isSelected ? '#ec4899' : isTodayDate ? '#3b82f6' : '#6b7280',
                      fontWeight: isTodayDate ? '600' : 'normal'
                    }}>
                      {date.day}
                    </Text>
                    <Text style={{ 
                      fontSize: 20, 
                      fontWeight: 'bold', 
                      color: isSelected ? '#ec4899' : isTodayDate ? '#3b82f6' : isPast ? '#9ca3af' : '#1f2937'
                    }}>
                      {date.date}
                    </Text>
                    <Text style={{ 
                      fontSize: 12, 
                      color: isSelected ? '#ec4899' : isTodayDate ? '#3b82f6' : '#6b7280',
                      fontWeight: isTodayDate ? '600' : 'normal'
                    }}>
                      {date.month}
                    </Text>
                    {isTodayDate && (
                      <Text style={{ 
                        fontSize: 10, 
                        color: '#3b82f6', 
                        fontWeight: '600',
                        marginTop: 2
                      }}>
                        Hoje
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Professional Selection */}
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 16 }}>
              Escolha o(a) profissional
            </Text>
            
            {isLoadingProfessionals ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="large" color="#ec4899" />
                <Text style={{ marginTop: 10, color: '#6b7280' }}>
                  Carregando profissionais...
                </Text>
              </View>
            ) : professionalsError ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <AlertCircle size={32} color="#ef4444" />
                <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 8, marginBottom: 12 }}>
                  {professionalsError}
                </Text>
                {onRetryProfessionals && (
                  <TouchableOpacity 
                    onPress={onRetryProfessionals}
                    style={{ 
                      paddingVertical: 8, 
                      paddingHorizontal: 16, 
                      backgroundColor: '#ec4899', 
                      borderRadius: 6 
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '500' }}>Tentar Novamente</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : professionals.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ color: '#6b7280', textAlign: 'center' }}>
                  Nenhum profissional disponível para este serviço.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {professionals.map((professional) => (
                  <TouchableOpacity
                    key={professional.id}
                    style={{
                      borderWidth: 2,
                      borderColor: selectedProfessional?.id === professional.id ? '#ec4899' : '#e5e7eb',
                      backgroundColor: selectedProfessional?.id === professional.id ? '#fdf2f8' : 'white',
                      borderRadius: 12,
                      padding: 12,
                      marginRight: 16,
                      minWidth: 100,
                      alignItems: 'center'
                    }}
                    onPress={() => setSelectedProfessional(professional)}
                  >
                    <View style={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: 32, 
                      overflow: 'hidden', 
                      marginBottom: 8, 
                      backgroundColor: '#f3f4f6' 
                    }}>
                      <Image
                        source={{ uri: professional.image || professional.photo_url || 'https://via.placeholder.com/80' }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#1f2937', textAlign: 'center' }}>
                      {professional.name || professional.full_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Time Selection */}
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 16 }}>
              Horários disponíveis
            </Text>
            
            {/* Show message if no professional or date selected */}
            {(!selectedProfessional || !selectedDate) ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ color: '#6b7280', textAlign: 'center' }}>
                  Selecione um profissional e uma data para ver os horários disponíveis.
                </Text>
              </View>
            ) : isLoadingTimeSlots ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="large" color="#ec4899" />
                <Text style={{ marginTop: 10, color: '#6b7280' }}>
                  Carregando horários disponíveis...
                </Text>
              </View>
            ) : timeSlotsError ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <AlertCircle size={32} color="#ef4444" />
                <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 8, marginBottom: 12 }}>
                  {timeSlotsError}
                </Text>
                {onRetryTimeSlots && (
                  <TouchableOpacity 
                    onPress={onRetryTimeSlots}
                    style={{ 
                      paddingVertical: 8, 
                      paddingHorizontal: 16, 
                      backgroundColor: '#ec4899', 
                      borderRadius: 6 
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '500' }}>Tentar Novamente</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : availableTimes.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Text style={{ color: '#6b7280', textAlign: 'center' }}>
                  Nenhum horário disponível para esta data.
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {availableTimes.map((time, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      borderWidth: 2,
                      borderColor: selectedTime === time ? '#ec4899' : '#e5e7eb',
                      backgroundColor: selectedTime === time ? '#ec4899' : 'white',
                      borderRadius: 12,
                      padding: 12,
                      minWidth: 80,
                      alignItems: 'center'
                    }}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={{ 
                      fontWeight: '500', 
                      color: selectedTime === time ? 'white' : '#374151' 
                    }}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={{ padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
          <TouchableOpacity
            style={{
              backgroundColor: selectedDate && selectedProfessional && selectedTime ? '#ec4899' : '#d1d5db',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center'
            }}
            disabled={!selectedDate || !selectedProfessional || !selectedTime}
            onPress={() => {
              if (selectedDate && selectedProfessional && selectedTime) {
                onNavigate('confirmation');
                if (onScrollToTop && scrollRef) {
                  setTimeout(() => onScrollToTop(scrollRef), 0);
                }
              }
            }}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              Continuar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default AppointmentScreen;