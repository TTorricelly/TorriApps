import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { AppointmentScreenProps } from '../types';

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
              {availableDates.map((date, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    borderWidth: 2,
                    borderColor: selectedDate?.fullDate === date.fullDate ? '#ec4899' : '#e5e7eb',
                    backgroundColor: selectedDate?.fullDate === date.fullDate ? '#fdf2f8' : 'white',
                    borderRadius: 12,
                    padding: 12,
                    marginRight: 12,
                    minWidth: 70,
                    alignItems: 'center'
                  }}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{date.day}</Text>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>{date.date}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{date.month}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Professional Selection */}
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 16 }}>
              Escolha o(a) profissional
            </Text>
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
                      source={{ uri: professional.image }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#1f2937', textAlign: 'center' }}>
                    {professional.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Time Selection */}
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 16 }}>
              Horários disponíveis
            </Text>
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