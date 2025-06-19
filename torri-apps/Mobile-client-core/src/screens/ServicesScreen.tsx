import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Image, useWindowDimensions, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { ShoppingCart, Trash2, X, ChevronDown, ChevronRight, Plus, ArrowLeft } from 'lucide-react-native';
import RenderHtml from 'react-native-render-html';
import useServicesStore from '../store/servicesStore';
import ServiceDetailsView from '../components/ServiceDetailsView';
import { API_BASE_URL } from '../config/environment';
import { getCategories } from '../services/categoryService';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: string;
  description?: string;
  image?: string;
  image_liso?: string;
  image_ondulado?: string;
  image_cacheado?: string;
  image_crespo?: string;
}

interface HomeScreenRef {
  resetToCategories: () => void;
  navigateToCategories: () => void;
  navigateToOrders: () => void;
  navigateToCategoryServices: (categoryId: string) => void;
}

// Swipeable Service Card Component
const SwipeableServiceCard = ({ 
  service, 
  isExpanded, 
  onToggleExpanded, 
  onRemove, 
  onImagePress, 
  serviceCardRef,
  width 
}: {
  service: Service;
  isExpanded: boolean;
  onToggleExpanded: (serviceId: string) => void;
  onRemove: (serviceId: string) => void;
  onImagePress: (imageUrl: string) => void;
  serviceCardRef: (ref: View | null) => void;
  width: number;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const formatDuration = (minutes: number | undefined) => {
    if (!minutes) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim() || '-';
  };

  const formatPrice = (priceStr: string | number) => {
    const priceNum = typeof priceStr === 'number' ? priceStr : parseFloat(priceStr);
    if (isNaN(priceNum)) return 'R$ -';
    return `R$ ${priceNum.toFixed(2).replace('.', ',')}`;
  };

  const getFullImageUrl = (relativePath: string | null | undefined): string | null => {
    if (!relativePath) return null;
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath.replace('http://localhost:8000', API_BASE_URL);
    }
    return `${API_BASE_URL}${relativePath}`;
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX: tx } = event.nativeEvent;
      
      // If swiped left more than 120px, remove the item
      if (tx < -120) {
        // Animate out and remove
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -width,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onRemove(service.id);
        });
      } else {
        // Snap back to original position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  // Prepare images for carousel
  const imagesForCarousel = [];
  if (service?.image) {
    const fullUrl = getFullImageUrl(service.image);
    if (fullUrl) imagesForCarousel.push({ src: fullUrl, caption: "Imagem do Serviço" });
  }
  if (service?.image_liso) {
    const fullUrl = getFullImageUrl(service.image_liso);
    if (fullUrl) imagesForCarousel.push({ src: fullUrl, caption: "Liso" });
  }
  if (service?.image_ondulado) {
    const fullUrl = getFullImageUrl(service.image_ondulado);
    if (fullUrl) imagesForCarousel.push({ src: fullUrl, caption: "Ondulado" });
  }
  if (service?.image_cacheado) {
    const fullUrl = getFullImageUrl(service.image_cacheado);
    if (fullUrl) imagesForCarousel.push({ src: fullUrl, caption: "Cacheado" });
  }
  if (service?.image_crespo) {
    const fullUrl = getFullImageUrl(service.image_crespo);
    if (fullUrl) imagesForCarousel.push({ src: fullUrl, caption: "Crespo" });
  }

  return (
    <View style={styles.swipeContainer}>
      {/* Red background with "Remover" text that appears behind the card */}
      <Animated.View
        style={[
          styles.deleteBackground,
          {
            opacity: translateX.interpolate({
              inputRange: [-width, -60, 0],
              outputRange: [1, 0.7, 0],
              extrapolate: 'clamp',
            }),
          }
        ]}
      >
        <Text style={styles.deleteText}>Remover</Text>
        <Trash2 size={24} color="white" />
      </Animated.View>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View
          ref={serviceCardRef}
          style={[
            styles.serviceCard,
            {
              transform: [{ translateX }],
              opacity,
            }
          ]}
        >
        {/* Service Card Header - Always Visible */}
        <TouchableOpacity
          onPress={() => onToggleExpanded(service.id)}
          style={styles.cardHeader}
          activeOpacity={0.7}
        >
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>
              {service.name}
            </Text>
            <Text style={styles.serviceDuration}>
              Duração: {formatDuration(service.duration_minutes)}
            </Text>
            <Text style={styles.servicePrice}>
              {formatPrice(service.price)}
            </Text>
            
            {/* Tap hint for non-tech users */}
            <Text style={styles.tapHint}>
              {isExpanded ? 'Toque para recolher detalhes' : 'Toque para ver detalhes'}
            </Text>
            
            {/* Swipe hint */}
            <Text style={styles.swipeHint}>
              ← Deslize para remover
            </Text>
          </View>
          
          <View style={styles.cardActions}>
            {/* More prominent expand/collapse button */}
            <View style={styles.expandButton}>
              {isExpanded ? (
                <>
                  <ChevronDown size={18} color="#ec4899" />
                  <Text style={styles.expandButtonText}>Menos</Text>
                </>
              ) : (
                <>
                  <ChevronRight size={18} color="#ec4899" />
                  <Text style={styles.expandButtonText}>Mais</Text>
                </>
              )}
            </View>
            
            {/* Remove Button */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation(); // Prevent accordion toggle when removing
                onRemove(service.id);
              }}
              style={styles.removeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Expandable Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Image Carousel */}
            {imagesForCarousel.length > 0 && (
              <View style={styles.imagesSection}>
                <Text style={styles.imagesLabel}>
                  {(() => {
                    const hasGeneralImage = service?.image;
                    const hasHairImages = service?.image_liso || service?.image_ondulado || service?.image_cacheado || service?.image_crespo;
                    
                    if (hasGeneralImage && hasHairImages) {
                      return "Exemplos e variações do serviço:";
                    } else if (hasGeneralImage && !hasHairImages) {
                      return "Imagens do serviço:";
                    } else {
                      return "Exemplos para diferentes tipos de cabelo:";
                    }
                  })()}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {imagesForCarousel.map((image, index) => (
                    <View key={index} style={styles.imageItem}>
                      <TouchableOpacity
                        onPress={() => onImagePress(image.src)}
                        style={styles.imageContainer}
                      >
                        <Image
                          source={{ uri: image.src }}
                          style={styles.image}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                      {image.caption !== "Imagem do Serviço" && (
                        <Text style={styles.imageCaption}>
                          {image.caption}
                        </Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Service Description */}
            {service.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionLabel}>
                  Descrição:
                </Text>
                <View style={styles.descriptionContainer}>
                  <RenderHtml
                    contentWidth={width - 64}
                    source={{ html: service.description }}
                    tagsStyles={{
                      p: { color: '#6b7280', fontSize: 14, lineHeight: 18, margin: 0 },
                      strong: { fontWeight: 'bold', color: '#374151' },
                      b: { fontWeight: 'bold', color: '#374151' },
                    }}
                  />
                </View>
              </View>
            )}
          </View>
        )}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

interface Category {
  id: string;
  name: string;
  icon_url?: string;
  backgroundColor?: string;
  iconColor?: string;
  display_order?: number;
}

const ServicesScreen = ({ navigation, homeScreenRef }: { navigation?: any; homeScreenRef?: React.RefObject<HomeScreenRef> }) => {
  const { selectedServices, removeService, getTotalPrice } = useServicesStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedServiceForDetails, setSelectedServiceForDetails] = useState<Service | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const { width } = useWindowDimensions();
  
  // Ref for ScrollView and service card positions
  const scrollViewRef = useRef<ScrollView>(null);
  const serviceCardRefs = useRef<{ [key: string]: View | null }>({});

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
  };

  const toggleExpanded = (serviceId: string) => {
    const newExpandedId = expandedServiceId === serviceId ? null : serviceId;
    setExpandedServiceId(newExpandedId);
    
    // If expanding a service, scroll to it after a brief delay to allow the expansion animation
    if (newExpandedId && serviceCardRefs.current[serviceId]) {
      setTimeout(() => {
        serviceCardRefs.current[serviceId]?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            // Scroll to position the expanded card in a good viewing position
            // Offset by some margin so it's not right at the top
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 60), // 60px offset from top for better visibility
              animated: true,
            });
          },
          () => {
            // Fallback if measureLayout fails - just scroll a bit to ensure visibility
            scrollViewRef.current?.scrollTo({
              y: 100,
              animated: true,
            });
          }
        );
      }, 100); // Small delay to let expansion animation start
    }
  };

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    try {
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
        setCategories(sortedData);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setCategories([]);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleAddMoreServices = () => {
    setCategoriesModalVisible(true);
    if (categories.length === 0) {
      loadCategories();
    }
  };

  const handleCategorySelect = (category: Category) => {
    setCategoriesModalVisible(false);
    // Navigate to home and directly show the selected category's services
    navigation?.navigate('Início');
    // Small delay to ensure navigation completes, then navigate to category services
    setTimeout(() => {
      homeScreenRef?.current?.navigateToCategoryServices(category.id);
    }, 100);
  };

  const getFullImageUrl = (relativePath: string | null | undefined): string | null => {
    if (!relativePath) return null;
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath.replace('http://localhost:8000', API_BASE_URL);
    }
    return `${API_BASE_URL}${relativePath}`;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeAreaTop} />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation?.navigate('Início')}
            style={styles.backButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Serviços Selecionados</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <ScrollView ref={scrollViewRef} style={styles.scrollView}>
          {selectedServices.length === 0 ? (
            <View style={styles.emptyState}>
              <ShoppingCart size={64} color="#e5e7eb" />
              <Text style={styles.emptyStateText}>
                Nenhum serviço selecionado ainda.{'\n'}
                Adicione serviços a partir da tela inicial.
              </Text>
              
              {/* Add Service Button for Empty State */}
              <TouchableOpacity
                style={styles.addServiceButtonEmpty}
                onPress={() => {
                  // Navigate to home tab and ensure it shows categories
                  navigation?.navigate('Início');
                  homeScreenRef?.current?.navigateToCategories();
                }}
              >
                <Plus size={20} color="#ec4899" />
                <Text style={styles.addServiceButtonEmptyText}>
                  Adicionar Serviço
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.servicesContainer}>
              {/* Swipeable Services Cards */}
              {selectedServices.map((service: Service) => (
                <SwipeableServiceCard
                  key={service.id}
                  service={service}
                  isExpanded={expandedServiceId === service.id}
                  onToggleExpanded={toggleExpanded}
                  onRemove={removeService}
                  onImagePress={handleImagePress}
                  serviceCardRef={(ref) => (serviceCardRefs.current[service.id] = ref)}
                  width={width}
                />
              ))}

            </View>
          )}
        </ScrollView>

        {/* Bottom Action Bar - Similar to service list */}
        {selectedServices.length > 0 && (
          <View style={styles.bottomActionBar}>
            {/* Total Price Display */}
            <View style={styles.totalPriceDisplay}>
              <Text style={styles.totalLabel}>
                Total ({selectedServices.length} {selectedServices.length === 1 ? 'serviço' : 'serviços'}):
              </Text>
              <Text style={styles.totalPriceValue}>
                R$ {getTotalPrice().toFixed(2).replace('.', ',')}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {/* Two-button layout */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity 
                  style={styles.addMoreButton}
                  onPress={handleAddMoreServices}
                >
                  <Plus size={18} color="#ec4899" />
                  <Text style={styles.addMoreButtonText} numberOfLines={1}>
                    Serviços
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.continueButton}
                  onPress={() => {
                    // Navigate to appointment booking
                    console.log('Proceed to booking');
                  }}
                >
                  <Text style={styles.continueButtonText}>
                    Escolher data
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Service Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          {/* Modal Header */}
          <View style={{ backgroundColor: '#ec4899', paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              style={{ marginRight: 12 }}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', flex: 1 }} numberOfLines={1}>
              {selectedServiceForDetails?.name}
            </Text>
          </View>

          {/* Modal Content */}
          {selectedServiceForDetails && (
            <ServiceDetailsView 
              service={selectedServiceForDetails}
              onImagePress={handleImagePress}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Image Popup Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setImageModalVisible(false)}
        >
          {/* Close button */}
          <TouchableOpacity
            style={{ 
              position: 'absolute', 
              top: 64, 
              right: 20, 
              zIndex: 10, 
              backgroundColor: 'rgba(255,255,255,0.9)', 
              borderRadius: 20, 
              width: 40, 
              height: 40, 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
            onPress={() => setImageModalVisible(false)}
          >
            <X size={24} color="#000" />
          </TouchableOpacity>

          {/* Expanded image */}
          {selectedImage && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Image
                source={{ uri: selectedImage }}
                style={{ width: 320, height: 320, borderRadius: 12 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>

      {/* Categories Bottom Sheet Modal */}
      <Modal
        visible={categoriesModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCategoriesModalVisible(false)}
      >
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity 
            style={styles.bottomSheetBackdrop}
            activeOpacity={1}
            onPress={() => setCategoriesModalVisible(false)}
          />
          <View style={styles.bottomSheetContainer}>
            {/* Handle bar */}
            <View style={styles.bottomSheetHandle} />
            
            {/* Header */}
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Escolher Categoria</Text>
              <TouchableOpacity
                onPress={() => setCategoriesModalVisible(false)}
                style={styles.bottomSheetCloseButton}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Categories Grid */}
            <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
              {isLoadingCategories ? (
                <View style={styles.bottomSheetLoading}>
                  <Text style={styles.loadingText}>Carregando categorias...</Text>
                </View>
              ) : (
                <View style={styles.categoriesGrid}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={styles.categoryTile}
                      onPress={() => handleCategorySelect(category)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.categoryTileImageContainer}>
                        <Image
                          source={{ uri: getFullImageUrl(category.icon_url) || 'https://via.placeholder.com/80' }}
                          style={styles.categoryTileImage}
                          resizeMode="cover"
                        />
                      </View>
                      <Text style={styles.categoryTileName}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {/* Bottom padding for safe area */}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  safeAreaTop: {
    backgroundColor: '#ec4899',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center the title
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fce7f3',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  servicesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  serviceDuration: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  tapHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
  swipeHint: {
    fontSize: 11,
    color: '#d1d5db',
    marginTop: 2,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf2f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3e8ff',
    marginRight: 8,
  },
  expandButtonText: {
    fontSize: 12,
    color: '#ec4899',
    fontWeight: '600',
    marginLeft: 4,
  },
  removeButton: {
    padding: 8,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  imagesSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  imagesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  imageItem: {
    marginRight: 12,
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageCaption: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  descriptionSection: {
    marginTop: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  descriptionContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  bottomActionBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalPriceDisplay: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  totalPriceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ec4899',
  },
  buttonContainer: {
    padding: 16,
    paddingTop: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addMoreButton: {
    flex: 1.2,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ec4899',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addMoreButtonText: {
    color: '#ec4899',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  continueButton: {
    flex: 2,
    backgroundColor: '#ec4899',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fdf2f8',
    borderWidth: 2,
    borderColor: '#ec4899',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  addServiceButtonText: {
    color: '#ec4899',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addServiceButtonEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ec4899',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 24,
  },
  addServiceButtonEmptyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 20,
    borderRadius: 12,
  },
  deleteText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  // Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  bottomSheetCloseButton: {
    padding: 4,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottomSheetLoading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  categoryTile: {
    width: 110,
    marginBottom: 20,
    alignItems: 'center',
  },
  categoryTileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryTileImage: {
    width: '100%',
    height: '100%',
  },
  categoryTileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ServicesScreen;