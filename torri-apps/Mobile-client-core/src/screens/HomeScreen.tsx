import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Scissors, 
  User, 
  Fingerprint, 
  Gift, 
  Footprints, 
  Sparkles, 
  ArrowLeft, 
  Clock, 
  DollarSign, 
  MapPin,
  Calendar,
  CheckCircle
} from 'lucide-react-native';

interface HomeScreenProps {
  navigation: any;
}

interface Category {
  id: string;
  name: string;
  backgroundColor: string;
  iconColor: string;
  image: string;
  icon: (props: any) => JSX.Element;
}

interface Service {
  id: number;
  name: string;
  duration: string;
  price: string;
}

interface ServiceDetail {
  images: { src: string; caption: string }[];
  description: string;
}

interface Professional {
  id: number;
  name: string;
  image: string;
}

interface DateOption {
  day: string;
  date: string;
  month: string;
  fullDate: string;
}

const HomeScreen = forwardRef<any, HomeScreenProps>(({ navigation }, ref) => {
  const [currentScreen, setCurrentScreen] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<DateOption | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [observations, setObservations] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    resetToCategories: () => {
      setCurrentScreen('categories');
      setSelectedCategory(null);
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedProfessional(null);
      setSelectedTime(null);
      setObservations('');
    },
    navigateToOrders: () => {
      setCurrentScreen('orders');
    },
  }));

  const categories: Category[] = [
    {
      id: 'cabelo',
      name: 'Cabelo',
      backgroundColor: '#fce7f3',
      iconColor: '#ec4899',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <Scissors {...props} />,
    },
    {
      id: 'barba',
      name: 'Barba',
      backgroundColor: '#dbeafe',
      iconColor: '#3b82f6',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <User {...props} />,
    },
    {
      id: 'unhas',
      name: 'Unhas',
      backgroundColor: '#f3e8ff',
      iconColor: '#a855f7',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <Fingerprint {...props} />,
    },
    {
      id: 'massoterapia',
      name: 'Massoterapia',
      backgroundColor: '#dcfce7',
      iconColor: '#22c55e',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <Gift {...props} />,
    },
    {
      id: 'podologia',
      name: 'Podologia',
      backgroundColor: '#ccfbf1',
      iconColor: '#14b8a6',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <Footprints {...props} />,
    },
    {
      id: 'unhas-gel',
      name: 'Unhas em Gel',
      backgroundColor: '#fee2e2',
      iconColor: '#ef4444',
      image: "https://via.placeholder.com/100",
      icon: (props: any) => <Sparkles {...props} />,
    },
  ];

  const servicesData: Record<string, Service[]> = {
    cabelo: [
      { id: 1, name: "Escova curta (com lavagem)", duration: "1h - 1h 30min", price: "R$ 80,00" },
      { id: 2, name: "Escova média (com lavagem)", duration: "1h 15min - 1h 45min", price: "R$ 100,00" },
      { id: 3, name: "Escova longa (com lavagem)", duration: "1h 30min - 2h", price: "R$ 120,00" },
      { id: 4, name: "Corte feminino", duration: "45min - 1h", price: "R$ 60,00" },
      { id: 5, name: "Corte masculino", duration: "30min - 45min", price: "R$ 40,00" },
    ],
    barba: [
      { id: 1, name: "Barba completa", duration: "30min - 45min", price: "R$ 35,00" },
      { id: 2, name: "Aparar barba", duration: "15min - 30min", price: "R$ 25,00" },
      { id: 3, name: "Design de barba", duration: "45min - 1h", price: "R$ 50,00" },
    ],
    unhas: [
      { id: 1, name: "Manicure simples", duration: "45min - 1h", price: "R$ 30,00" },
      { id: 2, name: "Manicure com esmaltação", duration: "1h - 1h 15min", price: "R$ 40,00" },
      { id: 3, name: "Pedicure completo", duration: "1h - 1h 30min", price: "R$ 45,00" },
    ],
    massoterapia: [
      { id: 1, name: "Massagem relaxante", duration: "1h", price: "R$ 80,00" },
      { id: 2, name: "Massagem terapêutica", duration: "1h 15min", price: "R$ 100,00" },
      { id: 3, name: "Drenagem linfática", duration: "1h 30min", price: "R$ 120,00" },
    ],
    podologia: [
      { id: 1, name: "Tratamento de unhas", duration: "45min - 1h", price: "R$ 60,00" },
      { id: 2, name: "Remoção de calos", duration: "30min - 45min", price: "R$ 50,00" },
      { id: 3, name: "Tratamento completo", duration: "1h - 1h 30min", price: "R$ 90,00" },
    ],
    "unhas-gel": [
      { id: 1, name: "Aplicação de gel", duration: "1h 30min - 2h", price: "R$ 70,00" },
      { id: 2, name: "Manutenção de gel", duration: "1h - 1h 30min", price: "R$ 50,00" },
      { id: 3, name: "Remoção de gel", duration: "45min - 1h", price: "R$ 40,00" },
    ],
  };

  const serviceDetails: Record<number, ServiceDetail> = {
    1: {
      images: [
        { src: "https://via.placeholder.com/300", caption: "Liso" },
        { src: "https://via.placeholder.com/300", caption: "Ondulado" },
        { src: "https://via.placeholder.com/300", caption: "Encaracolado" },
        { src: "https://via.placeholder.com/300", caption: "Crespo" },
      ],
      description: `**O que é o serviço?**

A escova é um procedimento clássico que utiliza calor e técnica para modelar os fios, proporcionando um visual alinhado, com brilho e movimento. Ideal para quem busca praticidade e um look elegante para o dia a dia ou ocasiões especiais.

**Benefícios:**

- Alinhamento dos fios
- Redução de frizz
- Brilho intenso
- Maciez e sedosidade
- Facilidade para pentear

**Indicado para:**

Todos os tipos de cabelo que desejam um visual mais liso e modelado temporariamente. Ótimo para eventos, ou para quem gosta de variar o estilo.`,
    },
  };

  const availableDates: DateOption[] = [
    { day: "Sáb", date: "31", month: "Mai", fullDate: "2024-05-31" },
    { day: "Dom", date: "1", month: "Jun", fullDate: "2024-06-01" },
    { day: "Seg", date: "2", month: "Jun", fullDate: "2024-06-02" },
    { day: "Ter", date: "3", month: "Jun", fullDate: "2024-06-03" },
    { day: "Qua", date: "4", month: "Jun", fullDate: "2024-06-04" },
    { day: "Qui", date: "5", month: "Jun", fullDate: "2024-06-05" },
    { day: "Sex", date: "6", month: "Jun", fullDate: "2024-06-06" },
    { day: "Sáb", date: "7", month: "Jun", fullDate: "2024-06-07" },
  ];

  const professionals: Professional[] = [
    { id: 1, name: "Ana Silva", image: "https://via.placeholder.com/80" },
    { id: 2, name: "Carlos Lima", image: "https://via.placeholder.com/80" },
    { id: 3, name: "Maria Santos", image: "https://via.placeholder.com/80" },
    { id: 4, name: "João Costa", image: "https://via.placeholder.com/80" },
    { id: 5, name: "Lucia Ferreira", image: "https://via.placeholder.com/80" },
  ];

  const availableTimes = [
    "9:00", "9:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  ];

  const salonInfo = {
    name: "Salão Charme & Estilo",
    address: "Rua das Palmeiras, 123 - Bairro Flores, Cidade - UF",
  };

  const formatDateForDisplay = (date: DateOption | null): string => {
    if (!date) return "";
    const months: Record<string, string> = {
      Mai: "Maio", Jun: "Junho", Jul: "Julho", Ago: "Agosto",
      Set: "Setembro", Out: "Outubro", Nov: "Novembro", Dez: "Dezembro",
    };
    return `${date.day}, ${date.date} de ${months[date.month] || date.month}`;
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setCurrentScreen('services');
    setSelectedService(null);
  };

  const renderCategoriesScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Salon Header - Extends to top of screen */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
            Nome do Salão
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 }}>
        <Text style={{
          fontSize: 30,
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#374151',
          marginBottom: 32
        }}>
          Nossos Serviços
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={{ 
                width: '47%',
                backgroundColor: category.backgroundColor,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                marginBottom: 16
              }}
              activeOpacity={0.7}
              onPress={() => handleCategoryClick(category)}
            >
              <View style={{ position: 'relative', marginBottom: 8 }}>
                <View style={{ 
                  width: 96, 
                  height: 96, 
                  borderRadius: 48, 
                  overflow: 'hidden', 
                  borderWidth: 4, 
                  borderColor: 'white',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5
                }}>
                  <Image
                    source={{ uri: category.image }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
                <View style={{ 
                  position: 'absolute', 
                  bottom: 8, 
                  right: 8 
                }}>
                  {category.icon({ size: 32, color: category.iconColor })}
                </View>
              </View>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '500', 
                color: '#374151',
                textAlign: 'center'
              }}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        </ScrollView>
      </View>
    </View>
  );

  const renderServicesScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Header - Extends to top of screen */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setCurrentScreen('categories')} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
            {selectedCategory?.name}
          </Text>
        </View>
      </SafeAreaView>

      {/* Services List */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView style={{ flex: 1, padding: 16, paddingBottom: 100 }}>
          {servicesData[selectedCategory?.id || '']?.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={{
                borderWidth: 2,
                borderColor: selectedService?.id === service.id ? '#ec4899' : '#e5e7eb',
                backgroundColor: selectedService?.id === service.id ? '#fdf2f8' : 'white',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'flex-start'
              }}
              onPress={() => setSelectedService(service)}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedService?.id === service.id ? '#ec4899' : '#d1d5db',
                backgroundColor: selectedService?.id === service.id ? '#ec4899' : 'white',
                marginRight: 16,
                marginTop: 4,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedService?.id === service.id && (
                  <View style={{ width: 12, height: 12, backgroundColor: 'white', borderRadius: 6 }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 8 }}>
                  {service.name}
                </Text>
                <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 8 }}>
                  Duração: {service.duration}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ec4899' }}>
                  {service.price}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Confirm Button */}
        <View style={{ padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
          <TouchableOpacity
            style={{
              backgroundColor: selectedService ? '#ec4899' : '#d1d5db',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center'
            }}
            disabled={!selectedService}
            onPress={() => {
              if (selectedService) {
                setCurrentScreen('service-details');
              }
            }}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              Confirmar Seleção
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderServiceDetailsScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Header - Extends to top of screen */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setCurrentScreen('services')} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white', flex: 1 }} numberOfLines={1}>
            {selectedService?.name}
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView style={{ flex: 1, paddingBottom: 100 }}>
          {/* Image Carousel */}
          <View style={{ padding: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled>
              {serviceDetails[selectedService?.id || 1]?.images.map((image, index) => (
                <View key={index} style={{ width: 300, alignItems: 'center', marginRight: 16 }}>
                  <View style={{ 
                    width: 128, 
                    height: 128, 
                    borderRadius: 12, 
                    overflow: 'hidden', 
                    backgroundColor: '#f3f4f6' 
                  }}>
                    <Image
                      source={{ uri: image.src }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={{ 
                    textAlign: 'center', 
                    marginTop: 8, 
                    fontWeight: '500', 
                    color: '#374151' 
                  }}>
                    {image.caption}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Service Description */}
          <View style={{ padding: 16 }}>
            <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 }}>
              {serviceDetails[selectedService?.id || 1]?.description.split('\n').map((paragraph, index) => {
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return (
                    <Text key={index} style={{ 
                      fontWeight: 'bold', 
                      color: '#1f2937', 
                      marginTop: 16, 
                      marginBottom: 8,
                      fontSize: 16
                    }}>
                      {paragraph.replace(/\*\*/g, '')}
                    </Text>
                  );
                } else if (paragraph.startsWith('- ')) {
                  return (
                    <Text key={index} style={{ 
                      color: '#6b7280', 
                      marginLeft: 16, 
                      marginBottom: 4,
                      fontSize: 14
                    }}>
                      • {paragraph.substring(2)}
                    </Text>
                  );
                } else if (paragraph.trim()) {
                  return (
                    <Text key={index} style={{ 
                      color: '#6b7280', 
                      marginBottom: 12,
                      fontSize: 14,
                      lineHeight: 20
                    }}>
                      {paragraph}
                    </Text>
                  );
                }
                return null;
              })}
            </View>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={{ padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#ec4899',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center'
            }}
            onPress={() => setCurrentScreen('scheduling')}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              Continuar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderSchedulingScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Header - Extends to top of screen */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setCurrentScreen('service-details')} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
            Agendamento
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView style={{ flex: 1, paddingBottom: 100 }}>
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
                setCurrentScreen('confirmation');
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

  const renderConfirmationScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Header - Extends to top of screen */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setCurrentScreen('scheduling')} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>
            Confirmar Agendamento
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView style={{ flex: 1, padding: 16, paddingBottom: 100 }}>
        {/* Service Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#ec4899', marginBottom: 12 }}>
            Serviço Selecionado
          </Text>
          <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Scissors size={20} color="#ec4899" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#1f2937' }}>
                {selectedService?.name}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Clock size={20} color="#ec4899" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Duração: {selectedService?.duration}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <DollarSign size={20} color="#ec4899" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Preço: {selectedService?.price}
              </Text>
            </View>
          </View>
        </View>

        {/* Date and Time Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#ec4899', marginBottom: 12 }}>
            Data e Horário
          </Text>
          <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Calendar size={20} color="#ec4899" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: '#1f2937' }}>
                {formatDateForDisplay(selectedDate)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock size={20} color="#ec4899" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: '#1f2937' }}>
                {selectedTime}
              </Text>
            </View>
          </View>
        </View>

        {/* Professional Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#ec4899', marginBottom: 12 }}>
            Profissional
          </Text>
          <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ 
              width: 48, 
              height: 48, 
              borderRadius: 24, 
              overflow: 'hidden', 
              marginRight: 12, 
              backgroundColor: '#f3f4f6' 
            }}>
              <Image
                source={{ uri: selectedProfessional?.image }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#1f2937' }}>
              {selectedProfessional?.name}
            </Text>
          </View>
        </View>

        {/* Location Section */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#ec4899', marginBottom: 12 }}>
            Local
          </Text>
          <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <MapPin size={20} color="#ec4899" style={{ marginRight: 12, marginTop: 2 }} />
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#1f2937' }}>
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
            {selectedService?.price}
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
            backgroundColor: '#ec4899',
            padding: 16,
            borderRadius: 12,
            alignItems: 'center'
          }}
          onPress={() => setCurrentScreen('orders')}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
            Confirmar Agendamento
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </View>
  );

  const renderOrdersScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Header - Extends to top of screen */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
            Pedidos
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView style={{ flex: 1, paddingBottom: 100 }}>
        <View style={{ padding: 16, alignItems: 'center' }}>
          {/* Success Icon */}
          <View style={{ 
            width: 80, 
            height: 80, 
            backgroundColor: '#22c55e', 
            borderRadius: 40, 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: 16
          }}>
            <CheckCircle size={48} color="white" />
          </View>

          {/* Success Message */}
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 32, textAlign: 'center' }}>
            Agendamento Confirmado!
          </Text>
        </View>

        {/* Appointment Details */}
        <View style={{ padding: 16 }}>
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

          {/* Action Buttons */}
          <View style={{ marginTop: 32 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#ec4899',
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 12
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                Ver Meus Agendamentos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#f3f4f6',
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
                marginBottom: 12
              }}
            >
              <Text style={{ color: '#374151', fontSize: 16, fontWeight: 'bold' }}>
                Adicionar ao Calendário
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: '#f3f4f6',
                padding: 16,
                borderRadius: 12,
                alignItems: 'center'
              }}
              onPress={() => {
                setCurrentScreen('categories');
                setSelectedCategory(null);
                setSelectedService(null);
                setSelectedDate(null);
                setSelectedProfessional(null);
                setSelectedTime(null);
                setObservations('');
              }}
            >
              <Text style={{ color: '#374151', fontSize: 16, fontWeight: 'bold' }}>
                Voltar para o Início
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </View>
    </View>
  );

  if (currentScreen === 'categories') {
    return renderCategoriesScreen();
  }

  if (currentScreen === 'services') {
    return renderServicesScreen();
  }

  if (currentScreen === 'service-details') {
    return renderServiceDetailsScreen();
  }

  if (currentScreen === 'scheduling') {
    return renderSchedulingScreen();
  }

  if (currentScreen === 'confirmation') {
    return renderConfirmationScreen();
  }

  if (currentScreen === 'orders') {
    return renderOrdersScreen();
  }

  return renderCategoriesScreen();
});

export default HomeScreen;