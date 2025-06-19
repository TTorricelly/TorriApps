import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart, Trash2, Info, X } from 'lucide-react-native';
import useServicesStore from '../store/servicesStore';
import ServiceDetailsView from '../components/ServiceDetailsView';

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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-4 py-4">
          <Text className="text-2xl font-bold text-gray-900">Serviços Selecionados</Text>
          <Text className="text-sm text-gray-600 mt-1">
            {selectedServices.length === 0 
              ? 'Nenhum serviço selecionado' 
              : `${selectedServices.length} ${selectedServices.length === 1 ? 'serviço' : 'serviços'} selecionado${selectedServices.length === 1 ? '' : 's'}`
            }
          </Text>
        </View>

        {/* Content */}
        <ScrollView className="flex-1">
          {selectedServices.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <ShoppingCart size={64} color="#e5e7eb" />
              <Text className="text-gray-500 text-center mt-4">
                Nenhum serviço selecionado ainda.{'\n'}
                Adicione serviços a partir da tela inicial.
              </Text>
            </View>
          ) : (
            <View className="px-4 py-4">
              {/* Services list */}
              {selectedServices.map((service: Service) => (
                <View 
                  key={service.id}
                  className="bg-gray-50 rounded-lg p-4 mb-3 flex-row items-start"
                >
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900 mb-1">
                      {service.name}
                    </Text>
                    <Text className="text-sm text-gray-600 mb-1">
                      Duração: {formatDuration(service.duration_minutes)}
                    </Text>
                    <Text className="text-lg font-bold text-pink-500">
                      {formatPrice(service.price)}
                    </Text>
                  </View>
                  <View className="flex-row items-center ml-2">
                    <TouchableOpacity
                      onPress={() => handleShowDetails(service)}
                      className="p-2 rounded-full hover:bg-gray-100"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Info size={20} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeService(service.id)}
                      className="p-2 rounded-full hover:bg-red-50"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Total summary */}
              <View className="mt-6 pt-6 border-t border-gray-200">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600">Total de serviços:</Text>
                  <Text className="font-semibold text-gray-900">{selectedServices.length}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600">Duração total:</Text>
                  <Text className="font-semibold text-gray-900">{formatDuration(getTotalDuration())}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-lg font-semibold text-gray-900">Total:</Text>
                  <Text className="text-lg font-bold text-pink-500">{formatPrice(getTotalPrice())}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Button */}
        {selectedServices.length > 0 && (
          <View className="px-4 py-4 border-t border-gray-200">
            <TouchableOpacity 
              className="bg-pink-500 py-4 rounded-lg items-center"
              onPress={() => {
                // Navigate to appointment booking
                console.log('Proceed to booking');
              }}
            >
              <Text className="text-white font-semibold text-lg">
                Continuar para Agendamento
              </Text>
            </TouchableOpacity>
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
        <SafeAreaView className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="bg-pink-500 px-4 py-4 flex-row items-center">
            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              className="mr-3"
            >
              <X size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-bold flex-1" numberOfLines={1}>
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
          className="flex-1 bg-black/90 justify-center items-center"
          activeOpacity={1}
          onPress={() => setImageModalVisible(false)}
        >
          {/* Close button */}
          <TouchableOpacity
            className="absolute top-16 right-5 z-10 bg-white/90 rounded-full w-10 h-10 justify-center items-center"
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
                className="w-80 h-80 rounded-xl"
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default ServicesScreen;