import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react'; // Added useEffect
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, Modal, StatusBar, ActivityIndicator, Alert, StyleSheet } from 'react-native'; // Added ActivityIndicator, Alert, StyleSheet
import { SafeAreaView } from 'react-native-safe-area-context';
import useAuthStore from '../store/authStore'; // Import auth store
import { getUserProfile } from '../services/userService'; // Import user service
import { getCategories, getServicesByCategory } from '../services/categoryService'; // Import category service
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
  CheckCircle,
} from 'lucide-react-native';

interface HomeScreenProps {
  navigation: any; // This is usually provided by react-navigation
  // onLogout?: () => void; // Optional: if logout is handled via props passed from navigator
}

interface HomeScreenRef {
  resetToCategories: () => void;
  navigateToOrders: () => void;
}

// Define a type for the user object from the store for better type safety
type UserType = {
  id?: string;
  email?: string;
  fullName?: string;
  role?: string;
  isActive?: boolean;
  phone_number?: string; // Example of a field fetched by /users/me
  photo_path?: string;   // Example of a field fetched by /users/me
  // Add other fields that your user object might contain
} | null;


interface Category {
  id: string;
  name: string;
  backgroundColor: string;
  iconColor: string;
  icon_url: string | null; // From API (was image)
  // Add display_order if needed for sorting, otherwise it can be omitted from the interface if not used.
  // backgroundColor, iconColor, icon can be removed or made optional if not supplied by API / used with defaults.
  // For this step, we'll make them optional and handle defaults in the rendering step.
  backgroundColor?: string;
  iconColor?: string;
  icon?: (props: any) => JSX.Element;
  display_order?: number;
}

interface Service {
  id: string; // Changed from number to string for UUID
  name: string;
  duration_minutes: number; // Changed from duration: string
  price: string; // Keep as string for now, formatting will be handled in UI. API returns decimal.
  description?: string | null;
  category_id?: string; // UUID as string
  image_liso?: string | null;
  image_ondulado?: string | null;
  image_cacheado?: string | null;
  image_crespo?: string | null;
  // Add other fields from ServiceSchema if they will be used directly.
}

// interface ServiceDetail { // Commenting out as per plan for now // Removing entirely now
//   images: { src: string; caption: string }[];
//   description: string;
// }

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

// Define the inner component function with explicit types for props and ref
const HomeScreenInner: React.ForwardRefRenderFunction<HomeScreenRef, HomeScreenProps> = (props, ref) => {
  const { navigation } = props; // Destructure navigation here

  // All existing state, useEffect, helper functions, useImperativeHandle, and render logic
  // from the original HomeScreen component body goes here.
  const [currentScreen, setCurrentScreen] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<DateOption | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [observations, setObservations] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // For image carousel in service details

  // State for categories
  const [fetchedCategories, setFetchedCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // State for services
  const [fetchedServices, setFetchedServices] = useState<Service[]>([]); // Note: Service interface will be updated
  const [isLoadingServices, setIsLoadingServices] = useState(false); // Start false, true when category selected
  const [serviceError, setServiceError] = useState<string | null>(null);

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
        console.log('[HomeScreen] Attempting to fetch profile. isAuthenticated:', isAuthenticated, 'User from store:', JSON.stringify(user, null, 2));
        setIsProfileLoading(true);
        try {
          const rawProfileData = await getUserProfile();
          console.log('[HomeScreen] Profile data fetched successfully (raw):', JSON.stringify(rawProfileData, null, 2));
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
                    source={{ uri: category.icon_url || 'https://via.placeholder.com/100' }}
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
    if (selectedService?.image_liso) imagesForCarousel.push({ src: selectedService.image_liso, caption: "Liso" });
    if (selectedService?.image_ondulado) imagesForCarousel.push({ src: selectedService.image_ondulado, caption: "Ondulado" });
    if (selectedService?.image_cacheado) imagesForCarousel.push({ src: selectedService.image_cacheado, caption: "Cacheado" });
    if (selectedService?.image_crespo) imagesForCarousel.push({ src: selectedService.image_crespo, caption: "Crespo" });

    if (imagesForCarousel.length === 0) {
        imagesForCarousel.push({ src: 'https://via.placeholder.com/300', caption: selectedService?.name || "Serviço" });
    }

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
          {/* Image Carousel */}
          <View style={{ padding: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled>
              {imagesForCarousel.map((image, index) => (
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
              {descriptionText.split('\n').map((paragraph, index) => {
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
    )
  };

  const renderSchedulingScreen = () => (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Header - Extends to top of screen */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => {
            setCurrentScreen('service-details');
            setTimeout(() => scrollToTop(serviceDetailsScrollRef), 0);
          }} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white' }}>
            Agendamento
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView ref={schedulingScrollRef} style={{ flex: 1, paddingBottom: 100 }}>
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
                setTimeout(() => scrollToTop(confirmationScrollRef), 0);
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
          <TouchableOpacity onPress={() => {
            setCurrentScreen('scheduling');
            setTimeout(() => scrollToTop(schedulingScrollRef), 0);
          }} style={{ marginRight: 16 }}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>
            Confirmar Agendamento
          </Text>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <ScrollView ref={confirmationScrollRef} style={{ flex: 1, padding: 16, paddingBottom: 100 }}>
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
          onPress={() => {
            setCurrentScreen('orders');
            setTimeout(() => scrollToTop(ordersScrollRef), 0);
          }}
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

  // Main render logic for HomeScreenInner - decides which screen to show
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