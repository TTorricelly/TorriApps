import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { API_BASE_URL } from '../config/environment';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: string;
  description?: string | null;
  image?: string | null;
  image_liso?: string | null;
  image_ondulado?: string | null;
  image_cacheado?: string | null;
  image_crespo?: string | null;
}

interface ServiceDetailsViewProps {
  service: Service;
  onImagePress?: (imageUrl: string) => void;
}

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

const ServiceDetailsView: React.FC<ServiceDetailsViewProps> = ({ service, onImagePress }) => {
  const { width } = useWindowDimensions();
  
  const imagesForCarousel = [];
  
  // Add general service image first if available
  if (service?.image) {
    const fullUrl = getFullImageUrl(service.image);
    if (fullUrl) imagesForCarousel.push({ src: fullUrl, caption: "Imagem do Serviço" });
  }
  
  // Add hair type images
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

  const hasImages = imagesForCarousel.length > 0;
  const descriptionText = service?.description || "Descrição não disponível.";

  return (
    <ScrollView style={{ flex: 1 }}>
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
            {(() => {
              // Check if we have only general image or mix of images
              const hasGeneralImage = service?.image;
              const hasHairImages = service?.image_liso || 
                                   service?.image_ondulado || 
                                   service?.image_cacheado || 
                                   service?.image_crespo;
              
              if (hasGeneralImage && hasHairImages) {
                return "Exemplos e variações do serviço:";
              } else if (hasGeneralImage && !hasHairImages) {
                return "Imagens do serviço:";
              } else {
                return "Exemplos para diferentes tipos de cabelo:";
              }
            })()}
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
                  onPress={() => onImagePress && onImagePress(image.src)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: image.src }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                {(() => {
                  // Only show captions when we have multiple types of images (hair types)
                  const hasGeneralImage = service?.image;
                  const hasHairImages = service?.image_liso || 
                                       service?.image_ondulado || 
                                       service?.image_cacheado || 
                                       service?.image_crespo;
                  const showCaptions = hasHairImages || (hasGeneralImage && hasHairImages);
                  
                  return showCaptions ? (
                    <Text style={{ 
                      textAlign: 'center', 
                      marginTop: 8, 
                      fontWeight: '500', 
                      color: '#374151',
                      fontSize: 14
                    }}>
                      {image.caption}
                    </Text>
                  ) : null;
                })()}
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
  );
};

export default ServiceDetailsView;