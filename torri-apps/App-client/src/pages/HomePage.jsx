/**
 * HomePage Component (Web Version)
 * Maintains identical business logic from Mobile-client-core HomeScreen.tsx
 * Only UI components are adapted for web - all service calls and state management preserved
 */

import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../shared/hooks/useNavigation';
import { ROUTES } from '../shared/navigation';
import { 
  Scissors,
  User, 
  ArrowLeft, 
  MapPin,
  Calendar,
  CheckCircle,
  X,
  Eye,
  Loader2
} from 'lucide-react';

// Import services and stores (identical to mobile)
import { useAuthStore } from '../stores/authStore';
import useServicesStore from '../stores/servicesStore';
import { getUserProfile } from '../services/userService';
import { getCategories, getServicesByCategory } from '../services/categoryService';
import { getAvailableTimeSlots } from '../services/appointmentService';
import { buildAssetUrl } from '../utils/urlHelpers';
import { generateAvailableDates, formatDateForDisplay as formatDateUtil } from '../utils/dateUtils';
import { getProfessionalsForService } from '../services/professionalService';
import { buildServiceImages, getPrimaryServiceImage, hasServiceImages } from '../utils/imageUtils';
import { getServiceVariations as fetchServiceVariations } from '../services/serviceVariationsService.js';
import { ServiceVariations } from '../components/VariationChip';

// Helper functions (identical to mobile)
const formatDuration = (minutes) => {
  if (minutes === undefined || minutes === null || minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim() || '-';
};

const formatPrice = (priceStr) => {
  if (priceStr === undefined || priceStr === null) return 'R$ -';
  const priceNum = parseFloat(priceStr);
  if (isNaN(priceNum)) return 'R$ -';
  return `R$ ${priceNum.toFixed(2).replace('.', ',')}`;
};

const formatPriceWithEvaluation = (priceStr, isSubjectToEvaluation = false, hasVariations = false) => {
  if (priceStr === undefined || priceStr === null) return { price: 'R$ -', prefix: null };
  const priceNum = parseFloat(priceStr);
  if (isNaN(priceNum)) return { price: 'R$ -', prefix: null };
  
  const formattedPrice = `R$ ${priceNum.toFixed(2).replace('.', ',')}`;
  
  if (isSubjectToEvaluation) {
    return {
      price: formattedPrice,
      prefix: 'A partir de',
      isSubjectToEvaluation: true
    };
  }
  
  return {
    price: formattedPrice,
    prefix: null,
    isSubjectToEvaluation: false
  };
};

const getFullImageUrl = (relativePath) => {
  return buildAssetUrl(relativePath);
};

// buildServiceImages function now imported from imageUtils utility

const HomePageInner = ({ navigation }, ref) => {
  const location = useLocation();
  const { navigate } = useNavigation();
  
  // All state variables (identical to mobile)
  const [currentScreen, setCurrentScreen] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [observations, setObservations] = useState('');
  const [imagePopupVisible, setImagePopupVisible] = useState(false);
  const [selectedImageForPopup, setSelectedImageForPopup] = useState(null);
  const [serviceDetailsModalVisible, setServiceDetailsModalVisible] = useState(false);
  const [selectedServiceForModal, setSelectedServiceForModal] = useState(null);

  // Generate available dates (identical to mobile)
  const availableDates = generateAvailableDates(30);

  // All other state variables (identical to mobile)
  const [fetchedCategories, setFetchedCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState(null);
  const [fetchedServices, setFetchedServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [serviceError, setServiceError] = useState(null);
  const [fetchedProfessionals, setFetchedProfessionals] = useState([]);
  const [isLoadingProfessionals, setIsLoadingProfessionals] = useState(false);
  const [professionalsError, setProfessionalsError] = useState(null);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);
  const [timeSlotsError, setTimeSlotsError] = useState(null);

  // Service card expansion state (identical to mobile pattern)
  const [expandedServiceIds, setExpandedServiceIds] = useState(new Set());
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageForModal, setSelectedImageForModal] = useState(null);
  
  // Image loading and error state management
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const [imageErrors, setImageErrors] = useState({});
  
  // Service variations state
  const [serviceVariations, setServiceVariations] = useState({}); // { serviceId: [variationGroups] }

  // Auth and services store integration (identical to mobile)
  const { user, isAuthenticated, setProfile, logout: storeLogout } = useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    setProfile: state.setProfile,
    logout: state.logout,
  }));

  const { 
    selectedServices, 
    toggleService, 
    clearServices, 
    getTotalPrice,
    setServiceVariation,
    toggleServiceVariation,
    getServiceVariations,
    getServiceFinalPrice,
    getExpandedServicesCount
  } = useServicesStore((state) => ({
    selectedServices: state.selectedServices,
    toggleService: state.toggleService,
    clearServices: state.clearServices,
    getTotalPrice: state.getTotalPrice,
    setServiceVariation: state.setServiceVariation,
    toggleServiceVariation: state.toggleServiceVariation,
    getServiceVariations: state.getServiceVariations,
    getServiceFinalPrice: state.getServiceFinalPrice,
    getExpandedServicesCount: state.getExpandedServicesCount,
  }));

  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // ScrollView refs adapted for web
  const categoriesScrollRef = useRef(null);
  const servicesScrollRef = useRef(null);
  const serviceDetailsScrollRef = useRef(null);
  const schedulingScrollRef = useRef(null);
  const confirmationScrollRef = useRef(null);
  const ordersScrollRef = useRef(null);

  // All useEffect hooks (identical logic to mobile)
  useEffect(() => {
    const fetchProfile = async () => {
      if (isAuthenticated && user && !user.phone_number) {
        setIsProfileLoading(true);
        try {
          const rawProfileData = await getUserProfile();
          setProfile(rawProfileData);
        } catch (error) {
          console.error('Profile loading error:', error);
          console.error('Error details:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: window.location.href,
            tenantInfo: error.tenantInfo
          });
          alert(`Não foi possível carregar os detalhes do seu perfil. Erro: ${error.message}`);
        } finally {
          setIsProfileLoading(false);
        }
      }
    };
    fetchProfile();
  }, [isAuthenticated, user?.id, user?.phone_number]); // Use specific user properties instead of whole user object

  // Load categories function (identical to mobile)
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
        
        // Process category data
        sortedData.forEach(cat => {
          cat.processed_url = getFullImageUrl(cat.icon_url);
        });
        
        setFetchedCategories(sortedData);
      } else {
        setFetchedCategories([]);
      }
    } catch (err) {
      const errorMessage = typeof err.message === 'string' ? err.message : 'Failed to load categories.';
      setCategoryError(errorMessage);
      setFetchedCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Reset to categories screen when navigating to dashboard
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      setCurrentScreen('categories');
      setSelectedCategory(null);
      setExpandedServiceIds(new Set());
    }
  }, [location.pathname]);

  // Load variations for a service
  const loadServiceVariations = async (serviceId) => {
    try {
      const variations = await fetchServiceVariations(serviceId);
      setServiceVariations(prev => ({
        ...prev,
        [serviceId]: variations || []
      }));
    } catch (err) {
      // Silently fail - variations are optional
      setServiceVariations(prev => ({
        ...prev,
        [serviceId]: []
      }));
    }
  };

  // Load services function (identical to mobile)
  const loadServicesForCategory = async (categoryId) => {
    if (!categoryId) return;
    setIsLoadingServices(true);
    setServiceError(null);
    setFetchedServices([]);
    setServiceVariations({}); // Clear variations when loading new category
    try {
      const data = await getServicesByCategory(categoryId);
      if (Array.isArray(data)) {
        const services = data.map((service) => ({
          id: service.id,
          name: service.name,
          duration_minutes: service.duration_minutes,
          price: String(service.price),
          description: service.description,
          category_id: service.category_id,
          // New dynamic images array from ServiceImage table
          images: service.images || [],
          // Legacy static image fields for backward compatibility
          image: service.image,
          image_liso: service.image_liso,
          image_ondulado: service.image_ondulado,
          image_cacheado: service.image_cacheado,
          image_crespo: service.image_crespo,
          // Add parallel execution fields from mobile
          parallelable: service.parallelable,
          max_parallel_pros: service.max_parallel_pros,
          // Add price evaluation field
          price_subject_to_evaluation: service.price_subject_to_evaluation || false,
        }));
        
        setFetchedServices(services);
        
        // Load variations for each service
        services.forEach(service => {
          loadServiceVariations(service.id);
        });
      } else {
        setFetchedServices([]);
      }
    } catch (err) {
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


  // Helper function for scrolling (adapted for web)
  const scrollToTop = (scrollRef) => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Event handlers (identical logic to mobile)
  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setCurrentScreen('services');
    setSelectedService(null);
    setTimeout(() => scrollToTop(servicesScrollRef), 0);
  };

  const handleBackToCategories = () => {
    setCurrentScreen('categories');
    setSelectedCategory(null);
    setTimeout(() => scrollToTop(categoriesScrollRef), 0);
  };

  // Retry handlers (identical to mobile)
  const retryLoadCategories = () => {
    loadCategories();
  };

  const retryLoadServices = () => {
    if (selectedCategory?.id) {
      loadServicesForCategory(selectedCategory.id);
    }
  };

  // Service card expansion handlers (only one card expanded at a time)
  const handleToggleServiceExpansion = (serviceId) => {
    setExpandedServiceIds(prev => {
      const newSet = new Set();
      // If the clicked service is already expanded, close it (empty set)
      // Otherwise, expand only the clicked service
      if (!prev.has(serviceId)) {
        newSet.add(serviceId);
        
        // Scroll to the expanded card after state update, accounting for fixed header
        setTimeout(() => {
          const cardElement = document.getElementById(`service-card-${serviceId}`);
          if (cardElement && servicesScrollRef.current) {
            const headerHeight = 120; // Account for fixed header height
            const cardRect = cardElement.getBoundingClientRect();
            const scrollTop = servicesScrollRef.current.scrollTop;
            const targetScrollTop = scrollTop + cardRect.top - headerHeight - 8; // 8px minimal padding
            
            servicesScrollRef.current.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
      return newSet;
    });
  };

  const isServiceExpanded = (serviceId) => {
    return expandedServiceIds.has(serviceId);
  };

  // Handle image modal
  const handleImagePress = (imageUrl) => {
    setSelectedImageForModal(imageUrl);
    setImageModalVisible(true);
  };

  // Image loading and error handlers
  const handleImageLoad = (imageKey) => {
    setImageLoadingStates(prev => ({ ...prev, [imageKey]: false }));
    setImageErrors(prev => ({ ...prev, [imageKey]: false }));
  };

  const handleImageError = (imageKey) => {
    setImageLoadingStates(prev => ({ ...prev, [imageKey]: false }));
    setImageErrors(prev => ({ ...prev, [imageKey]: true }));
  };

  const handleImageLoadStart = (imageKey) => {
    setImageLoadingStates(prev => ({ ...prev, [imageKey]: true }));
    setImageErrors(prev => ({ ...prev, [imageKey]: false }));
  };

  // Handle variation selection
  const handleVariationSelect = (serviceId, groupId, variation) => {
    const service = fetchedServices.find(s => s.id === serviceId);
    const isServiceSelected = selectedServices.some(s => s.id === serviceId);
    
    if (variation === null) {
      // If variation is null, we're deselecting
      // Check if there are any other variations selected for this service BEFORE removing this one
      const currentVariations = getServiceVariations(serviceId);
      const remainingVariations = { ...currentVariations };
      delete remainingVariations[groupId]; // Simulate removing this variation
      const hasOtherVariations = Object.keys(remainingVariations).length > 0;
      
      setServiceVariation(serviceId, groupId, null);
      
      // Only remove service from cart if no other variations will remain selected
      if (service && isServiceSelected && !hasOtherVariations) {
        toggleService(service);
      }
    } else {
      // Select the variation and auto-add service to cart if not already selected
      setServiceVariation(serviceId, groupId, variation);
      if (service && !isServiceSelected) {
        toggleService(service);
      }
    }
  };

  // Handle variation toggle for multiple choice groups
  const handleVariationToggle = (serviceId, groupId, variation) => {
    const service = fetchedServices.find(s => s.id === serviceId);
    const isServiceSelected = selectedServices.some(s => s.id === serviceId);
    
    // Toggle the variation
    toggleServiceVariation(serviceId, groupId, variation);
    
    // Auto-add service to cart if not already selected and we're adding a variation
    if (service && !isServiceSelected) {
      toggleService(service);
    }
  };

  // Helper function to generate variation preview text
  const getVariationPreview = (variations) => {
    if (!variations || !Array.isArray(variations) || variations.length === 0) return null;
    
    const allVariations = variations.flatMap(group => group.variations || []);
    if (allVariations.length === 0) return null;
    
    // Show first few variation names
    const preview = allVariations
      .slice(0, 3)
      .map(v => v.name)
      .join(', ');
    
    const totalCount = allVariations.length;
    if (totalCount > 3) {
      return `${preview} +${totalCount - 3} mais`;
    }
    
    return preview;
  };

  // Helper function to calculate price range for services with variations
  const getPriceRange = (basePrice, variations) => {
    if (!variations || !Array.isArray(variations) || variations.length === 0) return null;
    
    const allVariations = variations.flatMap(group => group.variations || []);
    if (allVariations.length === 0) return null;
    
    const priceDeltas = allVariations.map(v => parseFloat(v.price_delta || 0));
    
    // If no price deltas or all are zero, no range needed
    if (priceDeltas.every(delta => delta === 0)) return null;
    
    const minDelta = Math.min(...priceDeltas);
    const maxDelta = Math.max(...priceDeltas);
    
    const base = parseFloat(basePrice || 0);
    const minPrice = base + minDelta;
    const maxPrice = base + maxDelta;
    
    if (minPrice === maxPrice) return null; // No range if same price
    
    return { minPrice, maxPrice };
  };

  // Categories screen render
  const renderCategoriesScreen = () => (
    <div ref={categoriesScrollRef} className="h-full overflow-y-auto mobile-scroll" style={{ backgroundColor: '#ec4899' }}>
      {/* Extended header background for overscroll */}
      <div className="bg-pink-500" style={{ paddingTop: '50px', marginTop: '-50px' }}>
        {/* Header */}
        <div className="safe-area-top px-6 py-6">
          <div className="text-white">
            <p className="text-pink-100 text-lg">Bem-vindo(a)!</p>
            <h1 className="text-2xl font-bold">{user?.fullName || 'Usuário'}</h1>
            <p className="text-pink-100 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 px-6 py-8 min-h-0 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Escolha uma categoria
          </h2>
        </div>

        {/* Loading State */}
        {isLoadingCategories && (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={32} className="spinner text-pink-500" />
          </div>
        )}

        {/* Error State */}
        {categoryError && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{categoryError}</p>
            <button
              onClick={retryLoadCategories}
              className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-smooth"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Categories Grid */}
        {!isLoadingCategories && !categoryError && (
          <div className="grid grid-cols-2 gap-4">
            {fetchedCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-smooth button-press"
              >
                <div className="flex flex-col items-center">
                  {category.icon_url ? (
                    <img
                      src={getFullImageUrl(category.icon_url)}
                      alt={category.name}
                      className="w-16 h-16 rounded-full mb-4 object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4"
                    style={{ display: category.icon_url ? 'none' : 'flex' }}
                  >
                    <Scissors size={24} className="text-pink-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 text-center">
                    {category.name}
                  </h3>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Service cart footer component (identical to mobile pattern)
  const renderServiceCartFooter = () => {
    
    if (selectedServices.length === 0) return null;
    
    return (
      <div className="fixed left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom z-50" style={{ bottom: '64px' }}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-700">
            Total ({getExpandedServicesCount()} {getExpandedServicesCount() === 1 ? 'serviço' : 'serviços'}):
          </span>
          <span className="text-xl font-bold text-pink-600">
            {formatPrice(getTotalPrice())}
          </span>
        </div>
        
        <button 
          onClick={() => {
            navigate(ROUTES.SERVICES);
          }}
          className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold text-lg hover:bg-pink-600 transition-smooth"
        >
          Continuar ({getExpandedServicesCount()})
        </button>
      </div>
    );
  };

  // Services screen render
  const renderServicesScreen = () => (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-40" style={{ backgroundColor: '#ec4899' }}>
        {/* Extended header background for overscroll */}
        <div className="bg-pink-500" style={{ paddingTop: '50px', marginTop: '-50px' }}>
          {/* Header */}
          <div className="safe-area-top px-6 py-4 flex items-center">
            <button
              onClick={handleBackToCategories}
              className="mr-4 p-2 hover:bg-pink-600 rounded-lg transition-smooth"
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">
                {selectedCategory?.name || 'Serviços'}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div ref={servicesScrollRef} className="flex-1 overflow-y-auto mobile-scroll" style={{ paddingTop: '120px' }}>
        {/* Main Content */}
        <div className="bg-white rounded-t-3xl px-6 py-8 min-h-0" style={{ marginTop: '-16px' }}>
        {/* Loading State */}
        {isLoadingServices && (
          <div className="flex justify-center items-center py-12">
            <Loader2 size={32} className="spinner text-pink-500" />
          </div>
        )}

        {/* Error State */}
        {serviceError && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{serviceError}</p>
            <button
              onClick={retryLoadServices}
              className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-smooth"
            >
              Tentar novamente
            </button>
          </div>
        )}


        {/* Services List */}
        {!isLoadingServices && !serviceError && (
          <div className={`space-y-4 ${selectedServices.length > 0 ? 'pb-40' : 'pb-24'}`}>
            {fetchedServices.map((service) => {
              const isSelected = selectedServices.some(s => s.id === service.id);
              const isExpanded = isServiceExpanded(service.id);
              const serviceImages = buildServiceImages(service);
              const variations = serviceVariations[service.id] || [];
              const selectedVariations = getServiceVariations(service.id);
              // Always calculate final price with variations, whether selected or not
              const finalPrice = getServiceFinalPrice(service) || parseFloat(service.price);
              const priceRange = getPriceRange(service.price, variations);
              
              // Check if service or any of its variations have price subject to evaluation
              const serviceSubjectToEvaluation = service.price_subject_to_evaluation;
              const hasVariationsSubjectToEvaluation = variations.some(group => 
                group.variations?.some(v => v.price_subject_to_evaluation)
              );
              const isAnySubjectToEvaluation = serviceSubjectToEvaluation || hasVariationsSubjectToEvaluation;
              
              // Get formatted price information
              const priceInfo = formatPriceWithEvaluation(
                service.price, 
                isAnySubjectToEvaluation, 
                variations.length > 0
              );
              
              return (
                <div
                  key={service.id}
                  id={`service-card-${service.id}`}
                  className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  {/* Service Card Header - Always Visible */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {service.name}
                        </h3>
                        
                        {/* Price Information with Evaluation Status */}
                        <div className="flex items-center justify-between">
                          {/* Left side: Price */}
                          <div className="flex items-center space-x-1">
                            {priceInfo.prefix && (
                              <span className="text-xs text-gray-500">
                                {priceInfo.prefix}
                              </span>
                            )}
                            <span className="text-sm font-bold text-pink-600">
                              {priceInfo.price}
                            </span>
                          </div>
                          
                          {/* Right side: Evaluation Badge */}
                          {priceInfo.isSubjectToEvaluation && (
                            <div className="flex items-center bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 flex-shrink-0">
                              <div className="w-1 h-1 bg-amber-400 rounded-full mr-1"></div>
                              <span className="text-xs font-medium text-amber-700 whitespace-nowrap">
                                Sujeito a avaliação
                              </span>
                            </div>
                          )}
                        </div>
                        
                      </div>
                      
                    </div>
                  </div>

                  {/* Service Images Carousel - Always Visible */}
                  {serviceImages.length > 0 && (
                    <div className="px-4 pb-4">
                      <div className="flex space-x-3 overflow-x-auto pb-2">
                        {serviceImages.map((image, index) => {
                          const imageKey = `${service.id}-${index}`;
                          const isLoading = imageLoadingStates[imageKey];
                          const hasError = imageErrors[imageKey];
                          
                          return (
                            <div key={index} className="flex-shrink-0 relative">
                              {/* Loading placeholder */}
                              {isLoading && (
                                <div className="absolute inset-0 w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                                  <Loader2 size={16} className="spinner text-gray-400" />
                                </div>
                              )}
                              
                              {/* Error placeholder */}
                              {hasError && (
                                <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                                  <Eye size={16} className="text-gray-400" />
                                </div>
                              )}
                              
                              {/* Image */}
                              {!hasError && (
                                <img
                                  src={image.src}
                                  alt={image.caption}
                                  className={`w-24 h-24 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity ${
                                    isLoading ? 'opacity-0' : 'opacity-100'
                                  }`}
                                  onClick={() => handleImagePress(image.src)}
                                  onLoadStart={() => handleImageLoadStart(imageKey)}
                                  onLoad={() => handleImageLoad(imageKey)}
                                  onError={() => handleImageError(imageKey)}
                                />
                              )}
                              
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Service Selection - Always Show Radio Buttons */}
                  <div className="px-4 pb-4">
                    {variations.length > 0 ? (
                      // Service with actual variations
                      <ServiceVariations
                        variationGroups={variations}
                        selectedVariations={selectedVariations}
                        onVariationSelect={(groupId, variation) => handleVariationSelect(service.id, groupId, variation)}
                        onVariationToggle={(groupId, variation) => handleVariationToggle(service.id, groupId, variation)}
                        size="small"
                        showGroupNames={false}
                        basePrice={parseFloat(service.price)}
                        baseDuration={service.duration_minutes || 0}
                      />
                    ) : (
                      // Service without variations - show base service option
                      <ServiceVariations
                        variationGroups={[{
                          id: 'base',
                          name: 'Base Service',
                          service_id: service.id,
                          variations: [{
                            id: 'base',
                            name: service.name,
                            price_delta: 0,
                            duration_delta: 0,
                            display_order: 0,
                            price_subject_to_evaluation: service.price_subject_to_evaluation || false,
                            service_variation_group_id: 'base'
                          }]
                        }]}
                        selectedVariations={isSelected ? { 'base': { id: 'base' } } : {}}
                        onVariationSelect={(groupId, variation) => {
                          // Handle base service selection - toggle on/off
                          // If variation is null, we're unselecting, otherwise selecting
                          if (variation === null && isSelected) {
                            toggleService(service); // Unselect
                          } else if (variation !== null && !isSelected) {
                            toggleService(service); // Select
                          }
                        }}
                        onVariationToggle={() => {}} // Not used for base services
                        size="small"
                        showGroupNames={false}
                        basePrice={parseFloat(service.price)}
                        baseDuration={service.duration_minutes || 0}
                      />
                    )}
                  </div>

                  {/* Click to see description */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => handleToggleServiceExpansion(service.id)}
                      className="w-full flex items-center justify-center space-x-2 py-2 text-gray-600 hover:text-gray-800 transition-smooth"
                    >
                      <Eye size={16} />
                      <span className="text-sm">
                        {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                      </span>
                    </button>
                  </div>

                  {/* Expandable Description Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4">
                      {/* Service Description */}
                      {service.description && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Descrição</h4>
                          <div 
                            className="text-gray-600 text-sm prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: service.description }}
                          />
                        </div>
                      )}

                      {/* Service Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-500">Duração:</span>
                          <span className="ml-2 font-medium">{formatDuration(service.duration_minutes)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Preço:</span>
                          <span className="ml-2 font-medium text-pink-600">{formatPrice(service.price)}</span>
                        </div>
                      </div>

                      {/* Add Service Button */}
                      <button
                        onClick={() => {
                          if (isSelected) {
                            // Remove service
                            toggleService(service);
                          } else {
                            // Add service
                            toggleService(service);
                            // For services with variations, automatically select the first variation of each required group
                            const serviceVariations = variations;
                            if (serviceVariations.length > 0) {
                              serviceVariations.forEach(group => {
                                if (group.variations && group.variations.length > 0) {
                                  // Auto-select first variation in each group
                                  const firstVariation = group.variations[0];
                                  setServiceVariation(service.id, group.id, firstVariation);
                                }
                              });
                            }
                          }
                        }}
                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-smooth ${
                          isSelected
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-pink-500 hover:bg-pink-600 text-white'
                        }`}
                      >
                        {isSelected ? 'Remover Serviço' : 'Adicionar Serviço'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );

  // Main render function
  return (
    <div className="h-full flex flex-col bg-white">
      {currentScreen === 'categories' && renderCategoriesScreen()}
      {currentScreen === 'services' && renderServicesScreen()}
      
      {/* Service Cart Footer - Shows on services screen when items selected */}
      {currentScreen === 'services' && renderServiceCartFooter()}

      {/* Image Modal */}
      {imageModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setImageModalVisible(false)}>
          <div className="relative max-w-md max-h-96 m-4">
            <button
              onClick={() => setImageModalVisible(false)}
              className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 text-white rounded-full z-10"
            >
              <X size={20} />
            </button>
            <img
              src={selectedImageForModal}
              alt="Service"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const HomePage = forwardRef(HomePageInner);

export default HomePage;