import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Image, useWindowDimensions, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart, Trash2, Info, X, ChevronDown, ChevronRight } from 'lucide-react-native';
import RenderHtml from 'react-native-render-html';
import useServicesStore from '../store/servicesStore';
import ServiceDetailsView from '../components/ServiceDetailsView';
import { API_BASE_URL } from '../config/environment';

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

const ServicesScreen = () => {
  const { selectedServices, removeService, getTotalPrice, getTotalDuration } = useServicesStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedServiceForDetails, setSelectedServiceForDetails] = useState<Service | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const { width } = useWindowDimensions();

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

  const handleShowDetails = (service: Service) => {
    setSelectedServiceForDetails(service);
    setModalVisible(true);
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalVisible(true);
  };

  const toggleExpanded = (serviceId: string) => {
    // If clicking the same service, collapse it. Otherwise, expand the new one (auto-collapse previous)
    setExpandedServiceId(expandedServiceId === serviceId ? null : serviceId);
  };

  // Helper function to construct full image URLs
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
          <Text style={styles.headerTitle}>Serviços Selecionados</Text>
          <Text style={styles.headerSubtitle}>
            {selectedServices.length === 0 
              ? 'Nenhum serviço selecionado' 
              : `${selectedServices.length} ${selectedServices.length === 1 ? 'serviço' : 'serviços'} selecionado${selectedServices.length === 1 ? '' : 's'}`
            }
          </Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView}>
          {selectedServices.length === 0 ? (
            <View style={styles.emptyState}>
              <ShoppingCart size={64} color="#e5e7eb" />
              <Text style={styles.emptyStateText}>
                Nenhum serviço selecionado ainda.{'\n'}
                Adicione serviços a partir da tela inicial.
              </Text>
            </View>
          ) : (
            <View style={styles.servicesContainer}>
              {/* Expandable Services Cards */}
              {selectedServices.map((service: Service) => {
                const isExpanded = expandedServiceId === service.id;
                
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
                  <View 
                    key={service.id}
                    style={styles.serviceCard}
                  >
                    {/* Service Card Header - Always Visible */}
                    <TouchableOpacity
                      onPress={() => toggleExpanded(service.id)}
                      style={styles.cardHeader}
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
                      </View>
                      
                      <View style={styles.cardActions}>
                        {/* Expand/Collapse Chevron */}
                        <TouchableOpacity
                          onPress={() => toggleExpanded(service.id)}
                          style={styles.chevronButton}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          {isExpanded ? (
                            <ChevronDown size={20} color="#6b7280" />
                          ) : (
                            <ChevronRight size={20} color="#6b7280" />
                          )}
                        </TouchableOpacity>
                        
                        {/* Remove Button */}
                        <TouchableOpacity
                          onPress={() => removeService(service.id)}
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
                                    onPress={() => handleImagePress(image.src)}
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
                  </View>
                );
              })}

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

            {/* Continue Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.continueButton}
                onPress={() => {
                  // Navigate to appointment booking
                  console.log('Proceed to booking');
                }}
              >
                <Text style={styles.continueButtonText}>
                  Continuar ({selectedServices.length})
                </Text>
              </TouchableOpacity>
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
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
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  chevronButton: {
    padding: 8,
    marginRight: 8,
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
  continueButton: {
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
});

export default ServicesScreen;