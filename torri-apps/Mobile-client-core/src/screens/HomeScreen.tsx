import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, ActivityIndicator, Alert, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RenderHtml from 'react-native-render-html';
import useAuthStore from '../store/authStore';
import { getUserProfile } from '../services/userService';
import { getCategories, getServicesByCategory } from '../services/categoryService';
import { getAvailableTimeSlots } from '../services/appointmentService';
import { API_BASE_URL } from '../config/environment';
import { 
  Scissors,
  User, 
  ArrowLeft, 
  MapPin,
  Calendar,
  CheckCircle,
  X,
} from 'lucide-react-native';

// Import shared types and new components
import { 
  UserType, 
  Category, 
  Service, 
  Professional, 
  DateOption, 
  SalonInfo, 
  ScreenType,
  AppointmentState 
} from '../types';
import { generateAvailableDates, formatDateForDisplay as formatDateUtil } from '../utils/dateUtils';
import { getProfessionalsForService } from '../services/professionalService';
import AppointmentScreen from './AppointmentScreen';
import AppointmentConfirmationScreen from './AppointmentConfirmationScreen';

interface HomeScreenProps {
  navigation: any; // This is usually provided by react-navigation
  // onLogout?: () => void; // Optional: if logout is handled via props passed from navigator
}

interface HomeScreenRef {
  resetToCategories: () => void;
  navigateToOrders: () => void;
}

// Helper functions for formatting
const formatDuration = (minutes: number | undefined) => {
  if (minutes === undefined || minutes === null || minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim() || '-';
};

const formatPrice = (priceStr: string | undefined | null) => {
  if (priceStr === undefined || priceStr === null) return 'R$ -';
  const priceNum = parseFloat(priceStr);
  if (isNaN(priceNum)) return 'R$ -';
  return `R$ ${priceNum.toFixed(2).replace('.', ',')}`;
};

// Helper function to construct full image URLs from relative paths
const getFullImageUrl = (relativePath: string | null | undefined): string | null => {
  if (!relativePath) return null;
  // If it's already a full URL, check if it needs localhost replacement
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    // Replace localhost with the actual server IP for mobile device compatibility
    return relativePath.replace('http://localhost:8000', API_BASE_URL);
  }
  // Construct full URL by prepending base URL from environment config
  return `${API_BASE_URL}${relativePath}`;
};

// Define the inner component function with explicit types for props and ref
const HomeScreenInner: React.ForwardRefRenderFunction<HomeScreenRef, HomeScreenProps> = (_, ref) => {
  const { width } = useWindowDimensions(); // For HTML renderer

  const [currentScreen, setCurrentScreen] = useState<ScreenType>('categories');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<DateOption | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [observations, setObservations] = useState('');
  const [imagePopupVisible, setImagePopupVisible] = useState(false);
  const [selectedImageForPopup, setSelectedImageForPopup] = useState<string | null>(null);

  // Create appointment state object for new components
  const appointmentState: AppointmentState = {
    selectedService,
    selectedDate,
    selectedProfessional,
    selectedTime,
    observations,
  };

  // State for categories
  const [fetchedCategories, setFetchedCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // State for services
  const [fetchedServices, setFetchedServices] = useState<Service[]>([]); // Note: Service interface will be updated
  const [isLoadingServices, setIsLoadingServices] = useState(false); // Start false, true when category selected
  const [serviceError, setServiceError] = useState<string | null>(null);

  // State for professionals
  const [fetchedProfessionals, setFetchedProfessionals] = useState<Professional[]>([]);
  const [isLoadingProfessionals, setIsLoadingProfessionals] = useState(false);
  const [professionalsError, setProfessionalsError] = useState<string | null>(null);

  // State for time slots
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [timeSlotsError, setTimeSlotsError] = useState<string | null>(null);

  // Auth store integration
  const { user, isAuthenticated, setProfile, logout: storeLogout } = useAuthStore((state) => ({
    user: state.user as UserType, // Cast user to UserType
    isAuthenticated: state.isAuthenticated,
    setProfile: state.setProfile,
    logout: state.logout,
  }));

  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // ScrollView refs for each screen
  const categoriesScrollRef = useRef<ScrollView>(null);
  const servicesScrollRef = useRef<ScrollView>(null);
  const serviceDetailsScrollRef = useRef<ScrollView>(null);
  const schedulingScrollRef = useRef<ScrollView>(null);
  const confirmationScrollRef = useRef<ScrollView>(null);
  const ordersScrollRef = useRef<ScrollView>(null);


  // Effect to fetch user profile details when authenticated
  useEffect(() => {
    const fetchProfile = async () => {
      // Check if user is authenticated and if detailed profile info (e.g., phone_number) is missing
      if (isAuthenticated && user && !user.phone_number) {
        setIsProfileLoading(true);
        try {
          const rawProfileData = await getUserProfile();
          setProfile(rawProfileData); // Update store with detailed profile
        } catch (error) {
          console.error('[HomeScreen] Error fetching profile:', error);
          Alert.alert("Erro de Perfil", "Não foi possível carregar os detalhes do seu perfil.");
          // Optional: Handle specific errors, e.g., 401 could trigger logout
          // The Axios interceptor should ideally handle global 401s.
          // if (error.message.includes("401")) { // Simplistic check
          //   storeLogout(); // Logout if token is invalid/expired
          // }
        } finally {
          setIsProfileLoading(false);
        }
      }
    };

    fetchProfile();
  }, [isAuthenticated, user, setProfile, storeLogout]);

  // Define loadCategories outside useEffect so it can be called by a retry button
  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      setCategoryError(null);
      const data = await getCategories();
      if (Array.isArray(data)) {
        const sortedData = data.sort((a, b) => {
          if (a.display_order !== undefined && b.display_order !== undefined) {
            if (a.display_order !== b.display_order) {
              return a.display_order - b.display_order;
            }
          }
          return a.name.localeCompare(b.name);
        });
        setFetchedCategories(sortedData);
      } else {
        console.warn("getCategories did not return an array:", data);
        setFetchedCategories([]);
      }
    } catch (err: any) { // Explicitly type err
      console.error('[HomeScreen] Error fetching categories:', err);
      // Ensure err.message is a string
      const errorMessage = typeof err.message === 'string' ? err.message : 'Failed to load categories.';
      setCategoryError(errorMessage);
      setFetchedCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []); // Empty dependency array to run once on mount

  // Define loadServicesForCategory outside useEffect so it can be called by a retry button
  const loadServicesForCategory = async (categoryId: string) => {
    if (!categoryId) return;
    setIsLoadingServices(true);
    setServiceError(null);
    setFetchedServices([]);
    try {
      const data = await getServicesByCategory(categoryId);
      if (Array.isArray(data)) {
        setFetchedServices(data.map((service: any) => ({ // Use :any temporarily
          id: service.id,
          name: service.name,
          duration_minutes: service.duration_minutes,
          price: String(service.price),
          description: service.description,
          category_id: service.category_id,
          image_liso: service.image_liso,
          image_ondulado: service.image_ondulado,
          image_cacheado: service.image_cacheado,
          image_crespo: service.image_crespo,
        })));
      } else {
        console.warn("getServicesByCategory did not return an array:", data);
        setFetchedServices([]);
      }
    } catch (err: any) { // Explicitly type err
      console.error(`[HomeScreen] Error fetching services for category ${categoryId}:`, err);
      const errorMessage = typeof err.message === 'string' ? err.message : 'Failed to load services for this category.';
      setServiceError(errorMessage);
      setFetchedServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    if (selectedCategory?.id) {
      loadServicesForCategory(selectedCategory.id);
    } else {
      setFetchedServices([]);
      setServiceError(null);
      setIsLoadingServices(false);
    }
  }, [selectedCategory]);

  // Define loadProfessionalsForService function
  const loadProfessionalsForService = async (serviceId: string) => {
    if (!serviceId) return;
    
    if (!isAuthenticated) {
      setProfessionalsError('User not authenticated');
      return;
    }
    
    setIsLoadingProfessionals(true);
    setProfessionalsError(null);
    setFetchedProfessionals([]);
    try {
      const data = await getProfessionalsForService(serviceId);
      if (Array.isArray(data)) {
        // Transform backend data to match existing component expectations
        const transformedProfessionals = data.map((prof: any) => ({
          ...prof,
          // Legacy support for existing components
          name: prof.full_name,
          image: getFullImageUrl(prof.photo_url) || 'https://via.placeholder.com/80',
        }));
        setFetchedProfessionals(transformedProfessionals);
      } else {
        setFetchedProfessionals([]);
      }
    } catch (err: any) {
      console.error(`[HomeScreen] Error fetching professionals for service ${serviceId}:`, err);
      const errorMessage = typeof err.message === 'string' ? err.message : 'Failed to load professionals for this service.';
      setProfessionalsError(errorMessage);
      setFetchedProfessionals([]);
    } finally {
      setIsLoadingProfessionals(false);
    }
  };

  // Function to load available time slots for a professional on a specific date
  const loadTimeSlots = async (professionalId: string, date: string) => {
    if (!professionalId || !date || !selectedService?.id) {
      setAvailableTimes([]);
      return;
    }
    
    setIsLoadingTimeSlots(true);
    setTimeSlotsError(null);
    try {
      const timeSlots = await getAvailableTimeSlots(selectedService.id, professionalId, date);
      setAvailableTimes(Array.isArray(timeSlots) ? timeSlots : []);
    } catch (err: any) {
      console.error(`[HomeScreen] Error fetching time slots for professional ${professionalId} on ${date}:`, err);
      const errorMessage = typeof err.message === 'string' ? err.message : 'Failed to load available time slots.';
      setTimeSlotsError(errorMessage);
      setAvailableTimes([]);
    } finally {
      setIsLoadingTimeSlots(false);
    }
  };

  // Load professionals when user navigates to scheduling screen
  useEffect(() => {
    if (currentScreen === 'scheduling' && selectedService?.id) {
      loadProfessionalsForService(selectedService.id);
    } else if (currentScreen !== 'scheduling') {
      // Clear professionals when leaving scheduling screen
      setFetchedProfessionals([]);
      setProfessionalsError(null);
      setIsLoadingProfessionals(false);
      // Clear time slots as well
      setAvailableTimes([]);
      setTimeSlotsError(null);
      setIsLoadingTimeSlots(false);
    }
  }, [currentScreen, selectedService]);

  // Load time slots when professional and date are selected
  useEffect(() => {
    if (selectedProfessional?.id && selectedDate?.fullDate) {
      loadTimeSlots(selectedProfessional.id, selectedDate.fullDate);
    } else {
      // Clear time slots if either professional or date is not selected
      setAvailableTimes([]);
      setTimeSlotsError(null);
      setIsLoadingTimeSlots(false);
    }
  }, [selectedProfessional, selectedDate, selectedService]);

  // Helper function to scroll to top
  const scrollToTop = (scrollRef: React.RefObject<ScrollView>) => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Expose methods to parent component via ref (MainAppNavigator)
  useImperativeHandle(ref, () => ({
    resetToCategories: () => {
      setCurrentScreen('categories');
      setSelectedCategory(null);
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedProfessional(null);
      setSelectedTime(null);
      setObservations('');
      // Clear time slots
      setAvailableTimes([]);
      setTimeSlotsError(null);
      setIsLoadingTimeSlots(false);
      setTimeout(() => scrollToTop(categoriesScrollRef), 0);
    },
    navigateToOrders: () => {
      setCurrentScreen('orders');
      // Potentially pass some order confirmation data to this screen in the future
      setTimeout(() => scrollToTop(ordersScrollRef), 0);
    },
  }));

  // const categories: Category[] = [
  //   {
  //     id: 'cabelo',
  //     name: 'Cabelo',
  //     backgroundColor: '#fce7f3',
  //     iconColor: '#ec4899',
  //     icon_url: "https://via.placeholder.com/100",
  //     icon: (props: any) => <Scissors {...props} />,
  //   },
  //   {
  //     id: 'barba',
  //     name: 'Barba',
  //     backgroundColor: '#dbeafe',
  //     iconColor: '#3b82f6',
  //     icon_url: "https://via.placeholder.com/100",
  //     icon: (props: any) => <User {...props} />,
  //   },
  //   {
  //     id: 'unhas',
  //     name: 'Unhas',
  //     backgroundColor: '#f3e8ff',
  //     iconColor: '#a855f7',
  //     icon_url: "https://via.placeholder.com/100",
  //     icon: (props: any) => <Fingerprint {...props} />,
  //   },
  //   {
  //     id: 'massoterapia',
  //     name: 'Massoterapia',
  //     backgroundColor: '#dcfce7',
  //     iconColor: '#22c55e',
  //     icon_url: "https://via.placeholder.com/100",
  //     icon: (props: any) => <Gift {...props} />,
  //   },
  //   {
  //     id: 'podologia',
  //     name: 'Podologia',
  //     backgroundColor: '#ccfbf1',
  //     iconColor: '#14b8a6',
  //     icon_url: "https://via.placeholder.com/100",
  //     icon: (props: any) => <Footprints {...props} />,
  //   },
  //   {
  //     id: 'unhas-gel',
  //     name: 'Unhas em Gel',
  //     backgroundColor: '#fee2e2',
  //     iconColor: '#ef4444',
  //     icon_url: "https://via.placeholder.com/100",
  //     icon: (props: any) => <Sparkles {...props} />,
  //   },
  // ];

  // const servicesData: Record<string, Service[]> = { // Commenting out mock data
  //   cabelo: [
  //     { id: "1", name: "Escova curta (com lavagem)", duration_minutes: 90, price: "80.00" },
  //     { id: "2", name: "Escova média (com lavagem)", duration_minutes: 105, price: "100.00" },
  //     { id: "3", name: "Escova longa (com lavagem)", duration_minutes: 120, price: "120.00" },
  //     { id: "4", name: "Corte feminino", duration_minutes: 60, price: "60.00" },
  //     { id: "5", name: "Corte masculino", duration_minutes: 45, price: "40.00" },
  //   ],
  //   barba: [
  //     { id: "6", name: "Barba completa", duration_minutes: 45, price: "35.00" },
  //     { id: "7", name: "Aparar barba", duration_minutes: 30, price: "25.00" },
  //     { id: "8", name: "Design de barba", duration_minutes: 60, price: "50.00" },
  //   ],
  //   // ... other categories
  // };

  // const serviceDetails: Record<string, ServiceDetail> = { // Removing mock object
  //   "1": {
  //     images: [
  //       { src: "https://via.placeholder.com/300", caption: "Liso" },
  //       { src: "https://via.placeholder.com/300", caption: "Ondulado" },
  //       { src: "https://via.placeholder.com/300", caption: "Encaracolado" },
  //       { src: "https://via.placeholder.com/300", caption: "Crespo" },
  //     ],
  //     description: `**O que é o serviço?** \
// A escova é um procedimento clássico que utiliza calor e técnica para modelar os fios, proporcionando um visual alinhado, com brilho e movimento. Ideal para quem busca praticidade e um look elegante para o dia a dia ou ocasiões especiais. \
// \
// **Benefícios:** \
// \
// - Alinhamento dos fios \
// - Redução de frizz \
// - Brilho intenso \
// - Maciez e sedosidade \
// - Facilidade para pentear \
// \
// **Indicado para:** \
// \
// Todos os tipos de cabelo que desejam um visual mais liso e modelado temporariamente. Ótimo para eventos, ou para quem gosta de variar o estilo.`
//     },
//   };

  // Generate available dates dynamically (today + next 30 days)
  const availableDates: DateOption[] = generateAvailableDates(30);

  const salonInfo: SalonInfo = {
    name: "Salão Charme & Estilo",
    address: "Rua das Palmeiras, 123 - Bairro Flores, Cidade - UF",
  };

  // Navigation helper function
  const handleNavigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
  };

  // Use the utility function for consistent date formatting
  const formatDateForDisplay = formatDateUtil;

  const handleImagePress = (imageUrl: string) => {
    setSelectedImageForPopup(imageUrl);
    setImagePopupVisible(true);
  };

  const closeImagePopup = () => {
    setImagePopupVisible(false);
    setSelectedImageForPopup(null);
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setCurrentScreen('services');
    setSelectedService(null);
    setTimeout(() => scrollToTop(servicesScrollRef), 0);
  };

  const renderCategoriesScreen = () => {
    if (isLoadingCategories) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={{ marginTop: 10, color: '#374151' }}>Carregando categorias...</Text>
        </View>
      );
    }

    if (categoryError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'white' }}>
          <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>Erro ao carregar categorias:</Text>
          <Text style={{ color: 'red', textAlign: 'center' }}>{categoryError}</Text>
          <TouchableOpacity onPress={loadCategories} style={{ marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#ec4899', borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
        {/* User Info Header - Displayed on Categories Screen */}
        <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.headerWelcome}>Bem-vindo(a)!</Text>
            {isProfileLoading && !user?.fullName ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.headerUserName}>
                {user?.fullName || 'Carregando nome...'}
              </Text>
            )}
            <Text style={styles.headerUserEmail}>
              {user?.email || 'Carregando email...'}
            </Text>
          </View>
          {/* Placeholder for a potential profile picture or icon */}
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView ref={categoriesScrollRef} style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 }}>
        <Text style={{
          fontSize: 30,
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#374151',
          marginBottom: 32
        }}>
          Nossos Serviços
        </Text>

        {fetchedCategories.length === 0 && !isLoadingCategories && !categoryError && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
            <Text style={{ color: '#6b7280', fontSize: 16 }}>Nenhuma categoria encontrada.</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {fetchedCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={{ 
                width: '47%',
                backgroundColor: '#FFFFFF', // White background for cards
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                marginBottom: 16,
                borderWidth: 1, // Add a border
                borderColor: '#E5E7EB', // Light gray border color
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 }, // Subtle shadow
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1 // For Android
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
                  elevation: 5,
                  backgroundColor: '#f3f4f6' // Fallback background for image
                }}>
                  <Image
                    source={{ uri: getFullImageUrl(category.icon_url) || 'https://via.placeholder.com/100' }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
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
    )
  };

  const renderServicesScreen = () => {
    if (isLoadingServices) {
      return (
        <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
          <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
            <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => { setCurrentScreen('categories'); setTimeout(() => scrollToTop(categoriesScrollRef), 0); }} style={{ marginRight: 16 }}>
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
                {selectedCategory?.name}
              </Text>
            </View>
          </SafeAreaView>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', paddingTop: 20 }}>
            <ActivityIndicator size="large" color="#ec4899" />
            <Text style={{ marginTop: 10, color: '#374151' }}>Carregando serviços...</Text>
          </View>
        </View>
      );
    }

    if (serviceError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
           <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
            <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => { setCurrentScreen('categories'); setTimeout(() => scrollToTop(categoriesScrollRef), 0); }} style={{ marginRight: 16 }}>
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
                {selectedCategory?.name}
              </Text>
            </View>
          </SafeAreaView>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'white', paddingTop: 20 }}>
            <Text style={{ color: 'red', textAlign: 'center', marginBottom: 10 }}>Erro ao carregar serviços:</Text>
            <Text style={{ color: 'red', textAlign: 'center' }}>{serviceError}</Text>
            <TouchableOpacity onPress={() => selectedCategory && loadServicesForCategory(selectedCategory.id)} style={{ marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#ec4899', borderRadius: 8 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
        {/* Header - Extends to top of screen */}
        <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => {
            setCurrentScreen('categories');
            setTimeout(() => scrollToTop(categoriesScrollRef), 0);
          }} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
            {selectedCategory?.name}
          </Text>
        </View>
      </SafeAreaView>

      {/* Services List */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView ref={servicesScrollRef} style={{ flex: 1, padding: 16, paddingBottom: 100 }}>
          {fetchedServices.length === 0 && !isLoadingServices && !serviceError && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 }}>
              <Text style={{ color: '#6b7280', fontSize: 16 }}>Nenhum serviço encontrado para esta categoria.</Text>
            </View>
          )}
          {fetchedServices.map((service) => (
            <TouchableOpacity
              key={service.id} // Ensure service.id is string (UUID)
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
                  Duração: {formatDuration(service.duration_minutes)}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ec4899' }}>
                  {formatPrice(service.price)}
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
                setTimeout(() => scrollToTop(serviceDetailsScrollRef), 0);
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
  }; // End of renderServicesScreen

  const renderServiceDetailsScreen = () => {
    if (!selectedService) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
          <Text>Detalhes do serviço não disponíveis.</Text>
          {/* Optionally, add a button to go back or select a service */}
        </View>
      );
    }

    const imagesForCarousel = [];
    if (selectedService?.image_liso) {
      const fullUrl = getFullImageUrl(selectedService.image_liso);
      if (fullUrl) imagesForCarousel.push({ src: fullUrl, caption: "Liso" });
    }
    if (selectedService?.image_ondulado) {
      const fullUrl = getFullImageUrl(selectedService.image_ondulado);
      if (fullUrl) imagesForCarousel.push({ src: fullUrl, caption: "Ondulado" });
    }
    if (selectedService?.image_cacheado) {
      const fullUrl = getFullImageUrl(selectedService.image_cacheado);
      if (fullUrl) imagesForCarousel.push({ src: fullUrl, caption: "Cacheado" });
    }
    if (selectedService?.image_crespo) {
      const fullUrl = getFullImageUrl(selectedService.image_crespo);
      if (fullUrl) imagesForCarousel.push({ src: fullUrl, caption: "Crespo" });
    }

    const hasImages = imagesForCarousel.length > 0;
    

    const descriptionText = selectedService?.description || "Descrição não disponível.";

    return (
      <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
        {/* Header - Extends to top of screen */}
        <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => {
            setCurrentScreen('services');
            setTimeout(() => scrollToTop(servicesScrollRef), 0);
          }} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white', flex: 1 }} numberOfLines={1}>
            {selectedService?.name}
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView ref={serviceDetailsScrollRef} style={{ flex: 1, paddingBottom: 100 }}>
          {/* Image Carousel - Only show if service has images */}
          {hasImages && (
            <View style={{ padding: 16 }}>
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#1f2937', 
                marginBottom: 12,
                paddingHorizontal: 4
              }}>
                Exemplos para diferentes tipos de cabelo:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled>
                {imagesForCarousel.map((image, index) => (
                  <View key={index} style={{ width: 140, alignItems: 'center', marginRight: 16 }}>
                    <TouchableOpacity
                      style={{ 
                        width: 128, 
                        height: 128, 
                        borderRadius: 12, 
                        overflow: 'hidden', 
                        backgroundColor: '#f3f4f6',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3
                      }}
                      onPress={() => handleImagePress(image.src)}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: image.src }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <Text style={{ 
                      textAlign: 'center', 
                      marginTop: 8, 
                      fontWeight: '500', 
                      color: '#374151',
                      fontSize: 14
                    }}>
                      {image.caption}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Service Description */}
          <View style={{ padding: 16 }}>
            <View style={{ backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 }}>
              <RenderHtml
                contentWidth={width - 64} // Account for padding
                source={{ html: descriptionText }}
                tagsStyles={{
                  h1: { color: '#1f2937', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
                  h2: { color: '#1f2937', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
                  h3: { color: '#1f2937', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
                  p: { color: '#6b7280', fontSize: 14, lineHeight: 20, marginBottom: 12 },
                  strong: { fontWeight: 'bold', color: '#1f2937' },
                  b: { fontWeight: 'bold', color: '#1f2937' },
                  em: { fontStyle: 'italic' },
                  i: { fontStyle: 'italic' },
                  ul: { marginBottom: 12 },
                  ol: { marginBottom: 12 },
                  li: { color: '#6b7280', fontSize: 14, marginBottom: 4 },
                  a: { color: '#ec4899', textDecorationLine: 'underline' },
                  br: { height: 8 },
                }}
                systemFonts={['System']}
              />
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
            onPress={() => {
              setCurrentScreen('scheduling');
              setTimeout(() => scrollToTop(schedulingScrollRef), 0);
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


  const renderOrdersScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Header - Extends to top of screen */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
            Agendamentos
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView ref={ordersScrollRef} style={{ flex: 1, paddingBottom: 100 }}>
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
                Adicionar mais um serviço
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
                setTimeout(() => scrollToTop(categoriesScrollRef), 0);
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

  // Render the image popup modal - define this BEFORE the main render logic
  const renderImagePopup = () => (
    <Modal
      visible={imagePopupVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeImagePopup}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        activeOpacity={1}
        onPress={closeImagePopup}
      >
        {/* Close button */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 60,
            right: 20,
            zIndex: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 20,
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={closeImagePopup}
        >
          <X size={24} color="#000" />
        </TouchableOpacity>

        {/* Expanded image */}
        {selectedImageForPopup && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Image
              source={{ uri: selectedImageForPopup }}
              style={{
                width: width * 0.9,
                height: width * 0.9,
                borderRadius: 12,
              }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Modal>
  );

  // Main render logic with modal overlay
  const renderCurrentScreen = () => {
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
      return (
        <AppointmentScreen
          appointmentState={appointmentState}
          setSelectedDate={setSelectedDate}
          setSelectedProfessional={setSelectedProfessional}
          setSelectedTime={setSelectedTime}
          availableDates={availableDates}
          professionals={fetchedProfessionals}
          availableTimes={availableTimes}
          onNavigate={handleNavigate}
          onScrollToTop={scrollToTop}
          scrollRef={schedulingScrollRef}
          isLoadingProfessionals={isLoadingProfessionals}
          professionalsError={professionalsError}
          onRetryProfessionals={() => selectedService && loadProfessionalsForService(selectedService.id)}
          isLoadingTimeSlots={isLoadingTimeSlots}
          timeSlotsError={timeSlotsError}
          onRetryTimeSlots={() => selectedProfessional && selectedDate && loadTimeSlots(selectedProfessional.id, selectedDate.fullDate)}
        />
      );
    }

    if (currentScreen === 'confirmation') {
      return (
        <AppointmentConfirmationScreen
          appointmentState={appointmentState}
          setObservations={setObservations}
          salonInfo={salonInfo}
          onNavigate={handleNavigate}
          onScrollToTop={scrollToTop}
          scrollRef={confirmationScrollRef}
        />
      );
    }

    if (currentScreen === 'orders') {
      return renderOrdersScreen();
    }

    return renderCategoriesScreen();
  };

  return (
    <>
      {renderCurrentScreen()}
      {renderImagePopup()}
    </>
  );
}; // This correctly closes HomeScreenInner

// Wrap the inner function with forwardRef for export
const HomeScreen = forwardRef(HomeScreenInner);

export default HomeScreen;

const styles = StyleSheet.create({
  // Header styles for user info
  headerContainer: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerWelcome: {
    fontSize: 16,
    color: '#fce7f3', // Lighter pink for "Bem-vindo(a)!"
  },
  headerUserName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 2,
  },
  headerUserEmail: {
    fontSize: 14,
    color: '#f8bbd0', // Even lighter pink or white
    marginTop: 2,
  },
  // ... (add any other styles that were previously defined or needed)
});
